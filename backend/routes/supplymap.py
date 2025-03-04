import pandas as pd
import networkx as nx
import numpy as np
from bokeh.plotting import figure, from_networkx, show
from bokeh.models.glyphs import Circle, MultiLine
from bokeh.models import StaticLayoutProvider, GraphRenderer, CustomJS, NodesAndLinkedEdges
from flask import Blueprint
from flask import jsonify, request
from bokeh.embed import json_item
from models import SupplyChain, Node, Edge, db
import xyzservices.providers as xyz

supplymap_bp = Blueprint('supplymap', __name__, url_prefix='/api/map')  # 创建蓝图对象

COLOR = ['black', 'red']
COLORLEVEL = ['0', '1']

currentNxGraph = None

def wgs84_to_web_mercator(df, lon="Lon", lat="Lat", x="x", y="y"):
    """Converts decimal longitude/latitude to Web Mercator format"""
    k = 6378137
    df[x] = df[lon] * (k * np.pi / 180.0)
    df[y] = np.log(np.tan((90 + df[lat]) * np.pi / 360.0)) * k
    return df

def spherical_dist(lat1, lon1, lat2, lon2, r=3958.75):
    """计算球面距离，单位为英里"""
    lat1, lon1, lat2, lon2 = lat1 * np.pi / 180, lon1 * np.pi / 180, lat2 * np.pi / 180, lon2 * np.pi / 180
    cos_lat1 = np.cos(lat1)
    cos_lat2 = np.cos(lat2)
    cos_lat_d = np.cos(lat1 - lat2)
    cos_lon_d = np.cos(lon1 - lon2)
    return r * np.arccos(cos_lat_d - cos_lat1 * cos_lat2 * (1 - cos_lon_d))

def get_supply_map(id, has_latlon, has_layer):
    global currentNxGraph
    nodes = Node.query.filter(Node.supply_chain_id == id).all()
    edges = Edge.query.filter(Edge.supply_chain_id == id).all()
    nodes = [node.to_dict() for node in nodes]
    edges = [edge.to_dict() for edge in edges]
    dataNodes = pd.DataFrame(nodes).astype({
        'nodeID': int,
    })
    dataEdges = pd.DataFrame(edges).astype({
        'edgeID': int,
        'source': int,
        'target': int
    })
    node_attr = list(set(nodes[0].keys()).intersection(['name', 'nodeID', 'layer', 'longitude', 'latitude']))
    edge_attr = list(set(edges[0].keys()).intersection(['edgeID', 'source', 'target']))
    dataNodes = dataNodes[node_attr]
    dataEdges = dataEdges[edge_attr]
    dataNodes.set_index('nodeID')
    dataEdges.set_index('edgeID')
    dataNodes['alpha'] = 1.0
    dataEdges['alpha'] = 1.0
    G = nx.from_pandas_edgelist(dataEdges, 'source', 'target', create_using=nx.DiGraph())
    currentNxGraph = G
    node_radius = 5
    dataEdges.columns = dataEdges.columns.str.replace("source", "start")
    dataEdges.columns = dataEdges.columns.str.replace("target", "end")
    if not has_latlon and not has_layer:
        graph_tooltips = """<div>
                                <span style='font-size: 12px; font-weight: bold;'>@nodeID - @name</span>
                            </div>"""
    elif has_latlon and not has_layer:
        graph_tooltips = """<div>
                                <span style='font-size: 12px; font-weight: bold;'>@nodeID - @name</span><br/>
                                <span style='font-size: 12px; font-weight: bold;'>Lon: @longitude, Lat: @latitude</span>
                            </div>"""
    elif not has_latlon and has_layer:
        graph_tooltips = """<div>
                                <span style='font-size: 12px; font-weight: bold;'>@nodeID - @name</span><br/>
                                <span style='font-size: 12px; font-weight: bold;'>Layer: @layer</span>
                            </div>"""
    else:
        graph_tooltips = """<div>
                                <span style='font-size: 12px; font-weight: bold;'>@nodeID - @name</span><br/>
                                <span style='font-size: 12px; font-weight: bold;'>Lon: @longitude, Lat: @latitude</span><br/>
                                <span style='font-size: 12px; font-weight: bold;'>Layer: @layer</span>
                            </div>"""
    
        
    if has_latlon:
        # 将点的经纬度转换为web_mercator坐标
        wgs84_to_web_mercator(dataNodes, lon='longitude', lat='latitude')
        offset = 300000
        map_plot = figure(
                    x_range=(dataNodes["x"].min() - offset, dataNodes["x"].max() + offset),
                    y_range=(dataNodes["y"].min() - offset, dataNodes["y"].max() + offset),
                    width=900, height=600, 
                    x_axis_type="mercator", y_axis_type="mercator",
                    width_policy = 'max', max_width = 2000,
                    tools=["pan", "wheel_zoom", "lasso_select", "save", "reset"],
                    tooltips=graph_tooltips)
        map_plot.add_tile(xyz.Stadia.AlidadeSmooth)
        # 将source和target分别替换为start和end
        map_graph = GraphRenderer()
        map_graph.node_renderer.data_source.data = dataNodes
        map_graph.edge_renderer.data_source.data = dataEdges
        map_graph.layout_provider = StaticLayoutProvider(graph_layout=dict(zip(dataNodes['nodeID'], zip(dataNodes.x, dataNodes.y))))
        map_graph.node_renderer.glyph = Circle(radius=node_radius, radius_units="screen", fill_color='black', fill_alpha='alpha', line_alpha='alpha')
        map_graph.node_renderer.selection_glyph = Circle(radius=node_radius, radius_units="screen", fill_color='red')
        map_graph.node_renderer.nonselection_glyph = Circle(radius=node_radius, radius_units="screen", fill_color='gray', fill_alpha='alpha', line_alpha='alpha')
        map_graph.node_renderer.hover_glyph = Circle(radius=node_radius, radius_units="screen", fill_color='yellow', fill_alpha='alpha', line_alpha='alpha')
        
        map_graph.edge_renderer.glyph = MultiLine(line_color='black', line_alpha='alpha', line_width=2)
        map_graph.edge_renderer.selection_glyph = MultiLine(line_color='red', line_alpha='alpha', line_width=2)
        map_graph.edge_renderer.nonselection_glyph = MultiLine(line_color='black', line_alpha='alpha', line_width=2)
        map_graph.edge_renderer.hover_glyph = MultiLine(line_color='yellow', line_alpha='alpha', line_width=2)
        
        map_graph.selection_policy = NodesAndLinkedEdges()
        map_graph.inspection_policy = NodesAndLinkedEdges()

        select_callback = CustomJS(args=dict(node_source=map_graph.node_renderer.data_source), 
                                   code="""
            var selected_indices = node_source.selected.indices;
            console.log("Selected indices:", selected_indices);
            //console.log("Selected edges:", edge_source.selected.indices)
            window.updateSelectedNodes(selected_indices);  // 调用前端函数
        """)

        edge_select_callback = CustomJS(args=dict(s=map_graph.edge_renderer.data_source),
                                        code="""
            var selected_indices = s.selected.indices;
            console.log("Edge selected indices:", selected_indices);
            """)
        
        map_graph.node_renderer.data_source.selected.js_on_change("indices", select_callback)
        map_graph.edge_renderer.data_source.selected.js_on_change("indices", edge_select_callback)
        map_plot.renderers.append(map_graph)
    else:
        map_plot = None
        map_graph = None

    network_plot = figure(background_fill_color="#333333",
                          width=900, height=600,
                          width_policy = 'max', max_width = 2000,
                          tools=["pan", "wheel_zoom", "lasso_select", "save", "reset"],
                          tooltips=graph_tooltips)
    network_plot.xaxis.visible = False
    network_plot.yaxis.visible = False
    network_plot.grid.grid_line_color="gray"
    if has_layer:
        node_attributes = dataNodes.to_dict()['layer']
        nx.set_node_attributes(G, node_attributes, 'layer')
        network_graph = from_networkx(G, nx.multipartite_layout, subset_key='layer', align='horizontal' ,scale=100.0, center=(0, 0))
    else:
        network_graph = from_networkx(G, nx.spring_layout, scale=100.0, center=(0, 0))
    network_graph.node_renderer.data_source.data = dataNodes
    network_graph.edge_renderer.data_source.data = dataEdges
    network_graph.node_renderer.glyph = Circle(radius=node_radius, radius_units="screen", fill_color='white', line_color='white',fill_alpha='alpha', line_alpha='alpha')
    network_graph.node_renderer.selection_glyph = Circle(radius=node_radius, radius_units="screen", fill_color='red')
    network_graph.node_renderer.nonselection_glyph = Circle(radius=node_radius, radius_units="screen", fill_color='gray', fill_alpha='alpha', line_alpha='alpha')
    network_graph.node_renderer.hover_glyph = Circle(radius=node_radius, radius_units="screen", fill_color='yellow', fill_alpha='alpha', line_alpha='alpha')
    
    network_graph.edge_renderer.glyph = MultiLine(line_color='white', line_alpha='alpha', line_width=2)
    network_graph.edge_renderer.selection_glyph = MultiLine(line_color='red', line_alpha='alpha', line_width=2)
    network_graph.edge_renderer.nonselection_glyph = MultiLine(line_color='white', line_alpha='alpha', line_width=2)
    network_graph.edge_renderer.hover_glyph = MultiLine(line_color='yellow', line_alpha='alpha', line_width=2)
    
    network_graph.selection_policy = NodesAndLinkedEdges()
    network_graph.inspection_policy = NodesAndLinkedEdges()
    network_select_callback = CustomJS(args=dict(node_source=network_graph.node_renderer.data_source), 
                                   code="""
            var selected_indices = node_source.selected.indices;
            console.log("Selected indices:", selected_indices);
            //console.log("Selected edges:", edge_source.selected.indices)
            window.updateSelectedNodes(selected_indices);  // 调用前端函数
        """)
    network_graph.node_renderer.data_source.selected.js_on_change("indices", network_select_callback)
    network_plot.renderers.append(network_graph)
    # 绘制网络的度分布图
    # 已知每个点都有Degree属性
    degree = list(dict(G.degree()).values())
    # 绘制bokeh度分布图
    # 绘制度分布图
    hist, edges = np.histogram(degree, bins=10)
    hist = hist / hist.sum()
    degree_plot = figure( tools="save", background_fill_color="white", width=350, height=300)
    degree_plot.quad(top=hist, bottom=0, left=edges[:-1], right=edges[1:], fill_color="#036564", line_color="#033649")
    degree_plot.y_range.start = 0
    degree_plot.xaxis.axis_label = 'Degree'
    degree_plot.yaxis.axis_label = 'Frequency'
    degree_plot.grid.grid_line_color="gray"
    degree_plot.axis.axis_line_color="black"
    degree_plot.axis.axis_label_text_color="black"
    degree_plot.axis.axis_label_text_font_size="10pt"
    degree_plot.axis.axis_label_text_font_style="bold"
    return map_plot, map_graph, network_plot, network_graph, degree_plot

# 点传播算法
def propagation(graph: nx.DiGraph, ns, direction, max_step=10):
    forwardV = set(ns)
    backwardV = set(ns)
    nodes = set(ns) # 点集
    curr_step = 1
    while curr_step <= max_step:
        print("\nCurrent step: %d" % curr_step)
        print("Nodes: ", nodes)
        print("ForwardV: ", forwardV, " BackwardV: ", backwardV)
        forwardV_ = set([])
        backwardV_ = set([])
        if direction == "all" or direction == "forward":
            for node in forwardV:
                forward_nodes = set(graph.successors(node))
                # print(forward_nodes)
                forwardV_ = forwardV_.union(forward_nodes)
                nodes = nodes.union(forward_nodes)
        
        if direction == "all" or direction == "backward":
            for node in backwardV:
                backward_nodes = set(graph.predecessors(node))
                backwardV_ = backwardV_.union(backward_nodes)
                nodes = nodes.union(backward_nodes)
        if forwardV == forwardV_ and backwardV == backwardV_:
            break
        forwardV = forwardV_
        backwardV = backwardV_
        if len(forwardV) == 0 and len(backwardV) == 0:
            break
        curr_step += 1
    return nodes

@supplymap_bp.route('/graph/<int:id>', methods=['GET'])
def supplymap(id):
    try:
        supply_chain = SupplyChain.query.get(id)
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "未找到对应的供应链！"}), 404
    map_plot, map_graph, network_plot, network_graph, degree_plot = get_supply_map(id, supply_chain.has_latlon, supply_chain.has_layer)
    if map_plot is not None:
        map_graph_data = json_item(map_plot, "supplychainmap")
        map_graph_data = [map_graph_data, list(map_graph_data["doc"]["roots"][0]["attributes"])]
        map_node_source_id = map_graph.node_renderer.data_source.id
        map_edge_source_id = map_graph.edge_renderer.data_source.id
    else:
        map_graph_data = []
        map_node_source_id = ''
        map_edge_source_id = ''
    network_graph_data = json_item(network_plot, "supplynetwork")
    degree_plot_data = json_item(degree_plot, "degree_distribution")
    return jsonify({"map_graph_data": map_graph_data,
                    "map_node_source_id": map_node_source_id, 
                    "map_edge_source_id": map_edge_source_id,
                    "network_graph_data": [network_graph_data, list(network_graph_data["doc"]["roots"][0]["attributes"])],
                    "network_node_source_id": network_graph.node_renderer.data_source.id, 
                    "network_edge_source_id": network_graph.edge_renderer.data_source.id,
                    "degree_plot_data": [degree_plot_data, list(degree_plot_data["doc"]["roots"][0]["attributes"])],})

@supplymap_bp.route('/propagation', methods=['POST'])
def getPropagation():
    nodes = request.json.get("nodes")
    direction = request.json.get("direction")
    step = request.json.get("step")
    print(nodes, direction, step)
    try:
        if currentNxGraph is not None:
            if step is None:
                res_nodes = propagation(currentNxGraph, nodes, direction)
            else:
                res_nodes = propagation(currentNxGraph, nodes, direction, step)
            return jsonify({ "nodes": list(res_nodes), "statu": "Success" })
        else:
            return jsonify({ "nodes": nodes, "statu": "Fail because no Graph" })
    except Exception as err:
        return jsonify({ "nodes": [], "status": "Fail " + str(err)})


@supplymap_bp.route('/statistics/<int:id>', methods=['GET'])
def getStatistics(id):
    try:
        supply_chain = SupplyChain.query.get(id)
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e), 'message': "未找到对应的供应链！"}), 404
    properties_keys = ['nodes_degrees', 'nodes_degrees_in', 'nodes_degrees_out', 'strongly_connected', 'weakly_connected', 'DiG_avg_shortest_path_length', 'DiG_clustering_coefficients', 'DiG_network_density', 'G_avg_shortest_path_length', 'G_clustering_coefficients', 'G_network_density']
    supply_chain_properties = {key: supply_chain.to_dict()[key] for key in properties_keys}
    # 根据供应链的拓扑属性绘制统计图
    # print(supply_chain_properties)
    return jsonify({'status': 'success', 'message': '获取统计数据成功！', 'properties': supply_chain_properties})

