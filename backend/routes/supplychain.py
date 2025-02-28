from flask import Blueprint, request, jsonify
import pandas as pd
import networkx as nx
import numpy as np
from models import db, SupplyChain, Node, Edge
import json


supplychain_bp = Blueprint('supplychain', __name__, url_prefix='/api/supplychain')  # 创建蓝图对象

def spherical_dist(lat1, lon1, lat2, lon2, r=3958.75):
    """计算球面距离，单位为英里"""
    lat1, lon1, lat2, lon2 = lat1 * np.pi / 180, lon1 * np.pi / 180, lat2 * np.pi / 180, lon2 * np.pi / 180
    cos_lat1 = np.cos(lat1)
    cos_lat2 = np.cos(lat2)
    cos_lat_d = np.cos(lat1 - lat2)
    cos_lon_d = np.cos(lon1 - lon2)
    return r * np.arccos(cos_lat_d - cos_lat1 * cos_lat2 * (1 - cos_lon_d))

def calculate_centrality(nodes, edges):
    dataNodes = pd.DataFrame(nodes).astype({
        'nodeID': int,
    })
    dataEdges = pd.DataFrame(edges).astype({
        'edgeID': int,
        'source': int,
        'target': int
    })
    dataNodes.set_index('nodeID')
    dataEdges.set_index('edgeID')
    G = nx.from_pandas_edgelist(dataEdges, 'source', 'target')
    G_d = nx.from_pandas_edgelist(dataEdges, 'source', 'target', create_using=nx.DiGraph())
    try:
        dataNodes["OutDegreeCentrality"] = list(map(nx.out_degree_centrality(G_d).get, dataNodes.nodeID))
        dataNodes["BetweennessCentrality"] = list(map(nx.betweenness_centrality(G).get, dataNodes.nodeID))
        dataNodes["HarmonicCentrality"] = list(map(nx.harmonic_centrality(G).get, dataNodes.nodeID))
        dataNodes['KatzCentrality'] = list(map(nx.katz_centrality(G_d).get, dataNodes.nodeID))
        dataNodes['EigenvectorCentrality'] = list(map(nx.eigenvector_centrality(G).get, dataNodes.nodeID))
        dataNodes['CloseCentrality'] = list(map(nx.closeness_centrality(G).get, dataNodes.nodeID))
    except Exception as e:
        print(str(e))
    return dataNodes.to_dict(orient="records")

@supplychain_bp.route('/list', methods=['GET'])
def getSupplyChainList():
    # 从数据库中获取供应链列表，返回供应链列表
    supply_chains = SupplyChain.query.all()
    print(supply_chains)
    return jsonify([sc.to_dict() for sc in supply_chains])

@supplychain_bp.route('/create', methods=['POST'])
def createSupplyChain():
    try:
        name = request.json.get('name')
        description = request.json.get('description')
        nodes = request.json.get('nodes')
        edges = request.json.get('edges')
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "获取参数失败！"}), 400
    # 创建供应链对象
    supply_chain = SupplyChain(name=name, description=description)
    db.session.add(supply_chain)
    db.session.commit()
    supply_chain_id = supply_chain.id
    print('new supply_chain_id: ', supply_chain_id)
    try:
        # 将点和边添加进对应的表
        if nodes is not None and edges is not None:
            nodes = calculate_centrality(nodes, edges)
        if nodes is not None and len(nodes) > 0:
            node_attr = set(nodes[0].keys())
            node_properties = node_attr.difference(set(['name', 'nodeID', 'layer', 'longitude', 'latitude']))
            if 'longitude' in node_attr and 'latitude' in node_attr:
                supply_chain.has_latlon = True
            if 'layer' in node_attr:
                supply_chain.has_layer = True
            for node in nodes:
                new_node = Node(name=node['name'], node_id=int(node['nodeID']), supply_chain_id=supply_chain_id)
                new_node.properties = json.dumps({key: node[key] for key in node_properties})
                if 'longitude' in node_attr:
                    new_node.longitude = node['longitude']
                if 'latitude' in node_attr:
                    new_node.latitude = node['latitude']
                if 'layer' in node_attr:
                    new_node.layer = node['layer']
                db.session.add(new_node)
        if edges is not None and len(edges) > 0:
            edge_attr = set(edges[0].keys())
            edge_properties = edge_attr.difference(set(['edgeID', 'source', 'target']))
            for edge in edges:
                new_edge = Edge(edge_id=int(edge['edgeID']), source_id=int(edge['source']), target_id=int(edge['target']), supply_chain_id=supply_chain_id)
                new_edge.properties = json.dumps({key: edge[key] for key in edge_properties})
                db.session.add(new_edge)
        supply_chain.nodes = len(nodes) if nodes is not None else 0
        supply_chain.edges = len(edges) if edges is not None else 0
        db.session.commit()
    except Exception as e:
        db.session.delete(supply_chain)
        db.session.commit()
        print(str(e))
        return jsonify({'status': 'failed', 'error': str(e), 'message': "服务器内部错误！"}),  500
    return jsonify({
        'status': 'success',
    })

@supplychain_bp.route('/<int:id>', methods=['GET'])
def getSupplyChain(id):
    # 根据id从数据库中获取供应链信息，返回供应链信息
    try:
        supply_chain = SupplyChain.query.get(id)
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "未找到对应的供应链！"}), 404
    nodes = Node.query.filter(Node.supply_chain_id == id).all()
    edges = Edge.query.filter(Edge.supply_chain_id == id).all()
    return jsonify({
        'status': 'success',
        'supplychain': supply_chain.to_dict(),
        'nodes': [node.to_dict() for node in nodes],
        'edges': [edge.to_dict() for edge in edges]
    }), 200

@supplychain_bp.route('/<int:id>', methods=['DELETE'])
def deleteSupplyChain(id):
    # 根据id从数据库中删除供应链信息
    try:
        supply_chain = SupplyChain.query.get(id)
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "未找到对应的供应链！"}), 404
    # 首先删除supply_chain_id为id的node和edge
    Node.query.filter(Node.supply_chain_id == id).delete()
    Edge.query.filter(Edge.supply_chain_id == id).delete()
    db.session.commit()
    db.session.delete(supply_chain)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Supply chain deleted successfully'}), 200

@supplychain_bp.route('/<int:id>', methods=['PUT'])
def updateSupplyChain(id):
    try:
        name = request.json.get('name')
        description = request.json.get('description')
        nodes = request.json.get('nodes')
        edges = request.json.get('edges')
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "获取参数失败！"}), 400
    try:
        supply_chain = SupplyChain.query.get(id)
    except:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "未找到对应的供应链！"}), 404
    try:
        supply_chain.name = name
        supply_chain.description = description
        db.session.commit()
        # 删除原来的点和边
        Node.query.filter(Node.supply_chain_id == id).delete()
        Edge.query.filter(Edge.supply_chain_id == id).delete()
        db.session.commit()
        # 将新的点和边添加进对应的表
        if nodes is not None and edges is not None:
            nodes = calculate_centrality(nodes, edges)
        if nodes is not None and len(nodes) > 0:
            node_attr = set(nodes[0].keys())
            node_properties = node_attr.difference(set(['name', 'nodeID', 'layer', 'longitude', 'latitude']))
            if 'longitude' in node_attr and 'latitude' in node_attr:
                supply_chain.has_latlon = True
            if 'layer' in node_attr:
                supply_chain.has_layer = True
            for node in nodes:
                new_node = Node(name=node['name'], node_id=int(node['nodeID']), supply_chain_id=id)
                if 'longitude' in node_attr:
                    new_node.longitude = node['longitude']
                if 'latitude' in node_attr:
                    new_node.latitude = node['latitude']
                if 'layer' in node_attr:
                    new_node.layer = node['layer']
                new_node.properties = json.dumps({key: node[key] for key in node_properties})
                db.session.add(new_node)
        if edges is not None and len(edges) > 0:
            edge_attr = set(edges[0].keys())
            edge_properties = edge_attr.difference(set(['edgeID', 'source', 'target']))
            for edge in edges:
                try:
                    new_edge = Edge(edge_id=int(edge['edgeID']), source_id=int(edge['source']), target_id=int(edge['target']), supply_chain_id=id)
                    new_edge.properties = json.dumps({key: edge[key] for key in edge_properties})
                    db.session.add(new_edge)
                except Exception as e:
                    print(edge)
        supply_chain.nodes = len(nodes) if nodes is not None else 0
        supply_chain.edges = len(edges) if edges is not None else 0
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Supply chain updated successfully'}), 200
    except Exception as e:
        print(str(e))
        return jsonify({'status': 'failed', 'error': str(e), 'message': "服务器内部错误！"}), 500
