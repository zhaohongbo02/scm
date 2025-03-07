from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()

class SupplyChain(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	name = db.Column(db.String(80), unique=True)  # 供应链名称
	description = db.Column(db.String(255))  # 供应链描述
	created_at = db.Column(db.DateTime, default=datetime.now)   # 创建时间
	updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)  # 更新时间
	nodes = db.Column(db.Integer, default=0)  # 节点数量
	edges = db.Column(db.Integer, default=0)  # 边数量
	has_latlon = db.Column(db.Boolean, default=False)  # 是否有经纬度信息
	has_layer = db.Column(db.Boolean, default=False)   # 是否有层级信息
	properties = db.Column(db.JSON) # 存储所有可选字段，图的拓扑属性

	def to_dict(self):
		supply_chain_dict = {
			'id': self.id,
			'name': self.name,
			'description': self.description,
			'createdAt': self.created_at.strftime("%Y/%m/%d %H:%M:%S"),
			'updatedAt': self.updated_at.strftime("%Y/%m/%d %H:%M:%S"),
			'nodes': self.nodes,
			'edges': self.edges,
			'hasLatLon': self.has_latlon,
			'hasLayer': self.has_layer}
		properties = json.loads(self.properties)
		supply_chain_dict.update(properties)
		return supply_chain_dict

class Node(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	node_id = db.Column(db.Integer, nullable=False)  # 必需
	name = db.Column(db.String(128), nullable=False)    # 必需
	latitude = db.Column(db.Float, nullable=True)   # 非必需
	longitude = db.Column(db.Float, nullable=True)  # 非必需
	layer = db.Column(db.Integer, nullable=True)   # 非必需
	properties = db.Column(db.JSON) # 存储所有可选字段
	supply_chain_id = db.Column(db.Integer, db.ForeignKey('supply_chain.id'))

	def to_dict(self):
		node_dict = {
			'nodeID': self.node_id,
			'name': self.name}
		if self.latitude is not None:
			node_dict['latitude'] = self.latitude
		if self.longitude is not None:
			node_dict['longitude'] = self.longitude
		if self.layer is not None:
			node_dict['layer'] = self.layer
		properties = json.loads(self.properties)
		node_dict.update(properties)
		return node_dict

class Edge(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	edge_id = db.Column(db.Integer, nullable=False)  # 必需
	source_id = db.Column(db.String(64), nullable=False) # 必需
	target_id = db.Column(db.String(64), nullable=False) # 必需
	properties = db.Column(db.JSON)                     # 存储所有可选字段
	supply_chain_id = db.Column(db.Integer, db.ForeignKey('supply_chain.id'))

	def to_dict(self):
		edge_dict = {
			'edgeID': self.edge_id,
			'source': self.source_id,
			'target': self.target_id}
		properties = json.loads(self.properties)
		edge_dict.update(properties)
		return edge_dict
