import { Table, Select, Card, Space, Divider, Popover, Descriptions, Tag } from "antd";
import { InfoCircleOutlined } from '@ant-design/icons';
import {indicators, nodeAttr} from "./utils";
import { useState, useEffect, useContext } from "react";
import { SupplyChainContext } from "./SupplyChainProvider";
import axios from "axios";
import BokehChart from "./BokehChart";
const { Option } = Select;

const TopologyInfo = ({topologyData}) => {
		// 将对象转换为表格数据
	const formatTableData = (data) =>
		Object.keys(data).map((key) => ({
			key,
			degree: key,
			count: data[key],
	}));

	const columns = [
		{
			title: "Degree",
			dataIndex: "degree",
			key: "degree",
		},
		{
			title: "Count",
			dataIndex: "count",
			key: "count",
		},
	];

		// 网络整体特性数据
		const networkProperties = Object.keys(topologyData).length === 0 ? [] : [
				{
						key: "DiG",
						type: <b>Directed</b>,
						avgShortestPath: topologyData.DiG_avg_shortest_path_length ?? "N/A",
						clusteringCoefficient: topologyData.DiG_clustering_coefficients,
						networkDensity: topologyData.DiG_network_density.toFixed(5),
						connected: (
								<Tag color={topologyData.strongly_connected ? "green" : "red"}>
								{topologyData.strongly_connected ? "是" : "否"}
								</Tag>
						)
				},
				{
						key: "G",
						type: <b>Undirected</b>,
						avgShortestPath: topologyData.G_avg_shortest_path_length ?? "N/A",
						clusteringCoefficient: topologyData.G_clustering_coefficients,
						networkDensity: topologyData.G_network_density.toFixed(5),
						connected: (
								<Tag color={topologyData.weakly_connected ? "green" : "red"}>
								{topologyData.weakly_connected ? "是" : "否"}
								</Tag>
						)
				},
		];

		// 表头定义
		const networkColumns = [
				{
						title: "Network Type",
						dataIndex: "type",
						key: "type",
						width: 150,
				},
				{
						title: "Average shortest path length",
						dataIndex: "avgShortestPath",
						key: "avgShortestPath",
						width: 150,
				},
				{
						title: "Clustering coefficient",
						dataIndex: "clusteringCoefficient",
						key: "clusteringCoefficient",
						width: 150,
				},
				{
						title: "Density",
						dataIndex: "networkDensity",
						key: "networkDensity",
						width: 150,
				},
				{
						title: "Connected",
						dataIndex: "connected",
						key: "connected",
						width: 150,
				},
		];

		return (
				<Card title="Network Topology Analysis" style={{ marginTop: 10 }}>
						{Object.keys(topologyData).length === 0 ? (
							<div></div>
						) : (
								<div>
						<Table
								title={() => <b>Network Metrics</b>}
								dataSource={networkProperties}
								columns={networkColumns}
								pagination={false}
								bordered
						/>
						<Card title="Node Degree Distribution" style={{ marginTop: 16 }}>
								<Table
										dataSource={formatTableData(topologyData.nodes_degrees)}
										columns={columns}
										pagination={false}
										scroll={{ y: 200 }}
								/>
						</Card>
						<Card title="Node In-Degree Distribution" style={{ marginTop: 16 }}>
								<Table
										dataSource={formatTableData(topologyData.nodes_degrees_in)}
										columns={columns}
										pagination={false}
										scroll={{ y: 200 }}
								/>
						</Card>
						<Card title="Node Out-Degree Distribution" style={{ marginTop: 16 }}>
								<Table
										dataSource={formatTableData(topologyData.nodes_degrees_out)}
										columns={columns}
										pagination={false}
										scroll={{ y: 200 }}
								/>
						</Card>
						</div>
			)}
		</Card>
			);
};


const SupplierTable = ({ setSelectNode, activateKey }) => {
		// 根据 selectedIndicator 进行排序
		const [selectedRowKeys, setSelectedRowKeys] = useState([]);
		const [selectedIndicator, setSelectedIndicator] = useState(indicators[0]);
		const [validateIndicators, setValidateIndicators] = useState(indicators);
		const [topologyData, setTopologyData] = useState({});

		const { supplierData, setSupplierData, setSupplyRelationData,
						selectSupplyChainID,
						lastSupplyChainID, degreeDistribution } = useContext(SupplyChainContext);


			useEffect(() => {
				// 请求供应链地图图表数据
				const fetchSupplierData = async () => {
					try {
						const response = await axios.get(`http://127.0.0.1:5000/api/supplychain/${selectSupplyChainID}`);
						if (response.data.status === 'success') {
								console.log(response.data.nodes);
								console.log(response.data.edges);
								setSupplierData(response.data.nodes);
								setSupplyRelationData(response.data.edges);
								// 获取indicators和noders中中心度指标的交集
								let newIndicators = [];
								for (const indicator of indicators) {
										if (Object.keys(response.data.nodes[0]).includes(indicator)) {
												newIndicators.push(indicator);
										}
								}
								setValidateIndicators(newIndicators);
								console.log("Success fetching Supply Chain data!");
						}
					} catch (error) {
						console.error("Error fetching Supply Chain data:", error);
					}
				};

				const fectchTopologicalAnalysisData = async () => {
						try {
								const response = await axios.get(`http://127.0.0.1:5000/api/map/statistics/${selectSupplyChainID}`);
								const data = await response.data;
								console.log(data);
								setTopologyData(data.properties);
								console.log("Success fetching Topological Analysis Data!", topologyData);
						} catch (error) {
							console.error("Error fetching Topological Analysis Data:", error);
						}
					};

				if (activateKey === "1") {
					// 如果上一次选择的供应链id为空或者不为空且与当前id不同，则重新请求数据
					if (lastSupplyChainID && lastSupplyChainID === selectSupplyChainID) {
						console.log('SupplyChainID未发生变化, 不请求新的数据。');
					} else {
						fetchSupplierData();
						fectchTopologicalAnalysisData();
					}
				}
			}, [activateKey, selectSupplyChainID, lastSupplyChainID, setSupplierData, setSupplyRelationData]);

		const handleIndicatorSelectChange = (value) => {
				// 设置排序指标为对应位置的英文指标
				setSelectedIndicator(value);
		};

		const onSelectChange = (newSelectedRowKeys) => {
				console.log('selectedRowKeys changed: ', newSelectedRowKeys);
				setSelectedRowKeys(newSelectedRowKeys);
				setSelectNode(newSelectedRowKeys);
		};
		const rowSelection = {
				selectedRowKeys,
				onChange: onSelectChange,
		};

		const generateColumns = (header) => {
				let attrs = ['nodeID', 'name'];
				let columns = [
						{ title: 'SupplierID', dataIndex: 'nodeID', key: 'nodeID', width: 100,
								defaultSortOrder: 'ascend',
								sorter: (a, b) => a.nodeID - b.nodeID,
								fixed: 'left',
						},
						{ title: 'Name', dataIndex: 'name', key: 'name', width: 100, ellipsis: true, tooltip: true,
								sorter: (a, b) => a.name.localeCompare(b.name)
						},
						{ title: selectedIndicator , dataIndex: selectedIndicator, key: selectedIndicator,
								render: (value) => value.toFixed(4),
								width: 200,
								sorter: (a, b) => a[selectedIndicator] - b[selectedIndicator]},
				];
				for (const attr of nodeAttr) {
						if (attr.key !== "nodeID" && attr.key !== "name" && header.includes(attr.key)) {
								columns.push({ title: attr.key, dataIndex: attr.key, key: attr.key,
										width: 100,
										sorter: (a, b) => a[attr.key] - b[attr.key] });
								attrs.push(attr.key);
						}
				}
				for (const attr of header) {
						if (!attrs.includes(attr) && !indicators.includes(attr)) {
								columns.push({ title: attr, dataIndex: attr, key: attr,
										width: 100, ellipsis: true, tooltip: true,
										sorter: (a, b) => a[attr].localeCompare(b[attr])
								 });
						}
				}
				return columns;
		};

		return (
			 <div className="SupplierTable" >
						<br />
						<Space direction="vertical" style={{width: "100%", overflowX: "auto"}}>
								<Space direction="horizontal">
										<b> Node Centrality Indicator </b>
										<Select
												defaultValue={validateIndicators[0]}
												style={{ width: 250 }}
												onChange={handleIndicatorSelectChange} >
												{validateIndicators.map((item) => (
														<Option key={item} value={item}>
																<Space>
																		<p>{item}</p>
																<Popover
																		content={item}
																		title="Indicator Description"
																		trigger="hover"
																>
																		<InfoCircleOutlined/>
																</Popover>
																</Space>
														</Option>
												))}
										</Select>
								</Space>
								<div>
										<Table
												dataSource={supplierData}
												bordered={true}
												columns={generateColumns(supplierData.length > 0 ? Object.keys(supplierData[0]) : [])}
												rowKey="nodeID"
												rowSelection={rowSelection}
												size="middle"
												pagination={{
														pageSize: 50,
												}}
												scroll={{ y: 500, x: 'max-content' }}
										/>
								</div>
								<Divider />
								<Space>
										<Card title="Degree Distribution" style={{ width: 400 }}>
												<BokehChart
														chart_id='degree_distribution'
														bokehModel={degreeDistribution}/>
										</Card>
								</Space>
								<TopologyInfo topologyData={topologyData} />
						</Space>
				</div>
		);
};

export default SupplierTable;