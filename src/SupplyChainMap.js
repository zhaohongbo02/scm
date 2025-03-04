import React, { useContext, useEffect, useRef, useState } from 'react';
import { Row, Col, Button, Switch, Tabs, Space, List, Slider } from 'antd';
import axios from 'axios';
import { SupplyChainContext } from './SupplyChainProvider';
import BokehChart from './BokehChart';
import { getDataSource, getDocBySource } from './utils';


const SupplyChainMap = ({selectNode, activateKey, setSelectNode}) => {
  const [displayAll, setDisplayAll] = useState(true);
  const [affectedCompanies, setAffectedCompanies] = useState([]);
  const [lassoSelectNodes, setLassoSelectNodes] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [edgeAlpha, setEdgeAlpha] = useState(1.0);
  const [nodeAlpha, setNodeAlpha] = useState(1.0);
  const [activateChartKey, setActivateChartKey] = useState('1');
  const supplyChainMapDataSourceID = useRef({node_source_id: "", edge_source_id: ""});
  const supplyNetworkDataSourceID = useRef({node_source_id: "", edge_source_id: ""});
  const { selectSupplyChainID, 
          supplyChainMap, setSupplyChainMap,
          supplyNetwork, setSupplyNetwork,
          supplierData,
          lastSupplyChainID, setLastSupplyChainID,
          setDegreeDistribution, mapVisible
        } = useContext(SupplyChainContext);

  useEffect(() => {
    // 请求供应链地图图表数据
    const fetchGraphData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/map/graph/${selectSupplyChainID}`);
        const data = await response.data;
        console.log(data);
        if (data.map_graph_data.length === 0) {
          // 供应商信息不包含经纬度，没有供应链地图
          supplyChainMapDataSourceID.current = {
            node_source_id: '',
            edge_source_id: ''
          };
          setSupplyChainMap(null);
          // mapVisible.current = false;
        } else {
          supplyChainMapDataSourceID.current = {
            node_source_id: data.map_node_source_id,
            edge_source_id: data.map_edge_source_id
          };
          setSupplyChainMap(data.map_graph_data);
          // mapVisible.current = true;
        }
        supplyNetworkDataSourceID.current = {
          node_source_id: data.network_node_source_id,
          edge_source_id: data.network_edge_source_id
        };
        setSupplyNetwork(data.network_graph_data);
        setDegreeDistribution(data.degree_plot_data);
        console.log("Success fetching Bokeh plot");
      } catch (error) {
        console.error("Error fetching Bokeh plot:", error);
      }
    };

    if (activateKey === "1") {
      console.log('selectSupplyChainID:', selectSupplyChainID);
      console.log('mapVisible:', mapVisible.current);
      // 如果地图可见，激活地图，否则激活网络图
      if (mapVisible.current){
        setActivateChartKey('1');
      }else{
        setActivateChartKey('2');
      }
      // 如果上一次选择的供应链id为空或者不为空且与当前id不同，则重新请求图像
      if (lastSupplyChainID && lastSupplyChainID === selectSupplyChainID) {
        console.log('SupplyChainID未发生变化, 不请求新的数据。');
      } else {
        fetchGraphData();
        console.log('supplyChainMap', supplyChainMap);
        console.log('supplyNetwork', supplyNetwork);
        console.log('supplyChainMapDataSourceID', supplyChainMapDataSourceID);
        console.log('supplyNetworkDataSourceID', supplyNetworkDataSourceID);
        // fectchTopologicalAnalysisData();
      }
      setLastSupplyChainID(selectSupplyChainID);
    }
  }, [activateKey, selectSupplyChainID]);

  useEffect(() => {
    // 如果表格中选择的点发生变化，在地图上更新
    if (window.Bokeh) {
      try{
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const lasso_select = nodeSource.selected.indices;
        nodeSource.selected.indices = [...new Set([...lasso_select, ...selectNode])];
      } catch (error) {
        console.error("Error:", error);
      }
    }
  }, [selectNode, activateChartKey]);

  useEffect(() => {
    setAffectedCompanies(supplierData.filter((item) => lassoSelectNodes.includes(item.nodeID)));
  }, [supplierData, lassoSelectNodes]);

  useEffect(() => {
    if (window.Bokeh) {
      try{
        const edgeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.edge_source_id : supplyNetworkDataSourceID.current.edge_source_id );
        if (edgeSource) {
          for (const edgeID of edgeSource.data.edgeID) {
            edgeSource.data.alpha[edgeID] = edgeAlpha;
          }
          edgeSource.change.emit();
          console.log("change edge alpha");
        } else {
          console.error("not find edgesource");
        }
      } catch ( error) {
        console.error("Error:", error);
      }
    }
  }, [edgeAlpha, activateChartKey]);

  useEffect(() => {
    if (window.Bokeh) {
      try{
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        if (nodeSource) {
          for (const nodeID of nodeSource.data.nodeID) {
            nodeSource.data.alpha[nodeID] = nodeAlpha;
          }
          nodeSource.change.emit();
          console.log("change node alpha");
        } else {
          console.error("not find nodesource");
        }
        
      } catch ( error) {
        console.error("Error:", error);
      }
    }
  }, [nodeAlpha, activateChartKey]);

  useEffect( () => {
    // 如果activateChartKey发生变化，且变为1，reset地图
    if (activateChartKey === '1') {
      const mapDoc = getDocBySource(supplyChainMapDataSourceID.current.node_source_id);
      if (mapDoc) {
        const model = mapDoc.get_model_by_id(supplyChainMap[0].root_id);
        console.log(model);
        model.reset.emit();
      }
      }
  }, [activateChartKey, activateKey, supplyChainMap]);

  window.updateSelectedNodes = (node_indices) => {
    setLassoSelectNodes(node_indices);
    setSelectNode(node_indices);
    if (window.Bokeh) {
      // const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
      const edgeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.edge_source_id : supplyNetworkDataSourceID.current.edge_source_id );
      // 如果修改被选择的点，那么与其相连的边也会被选中
      let edge_select_indices = [];
      let edge_nonselect_indices = [];
      for (const edgeID of edgeSource.data.edgeID) {
        var start = edgeSource.data.start[edgeID];
        var end = edgeSource.data.end[edgeID];
        if (node_indices.includes(start) || node_indices.includes(end)) {
          edge_select_indices.push(edgeID);
        } else {
          edge_nonselect_indices.push(edgeID);
        }
      }
      edgeSource.selected.indices = [...new Set([...edgeSource.selected.indices, ...edge_select_indices])];
      edgeSource.selected.indices = edgeSource.selected.indices.filter(item => !edge_nonselect_indices.includes(item));
    }
  };

  const forwardEffect = async () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const requestData = { 'nodes': nodeSource.selected.indices,
          'direction': "forward",
          'step': 1
        }; // 要发送的数据
        const res = await fetch("http://127.0.0.1:5000/api/map/propagation", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData), // 将数据转为 JSON 字符串
        });
        const data = await res.json(); // 解析返回的 JSON 数据
        console.log(data.nodes);
        nodeSource.selected.indices = data.nodes;
        displaySelectNode(nodeSource.selected.indices);
        if (displayAll === true) {
          setDisplayAll(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const AllDirectionEffect = async () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const requestData = { 'nodes': nodeSource.selected.indices,
          'direction': "all",
          'step': 1
        }; // 要发送的数据
        const res = await fetch("http://127.0.0.1:5000/api/map/propagation", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData), // 将数据转为 JSON 字符串
        });
        const data = await res.json(); // 解析返回的 JSON 数据
        console.log(data.nodes);
        nodeSource.selected.indices = data.nodes;
        displaySelectNode(nodeSource.selected.indices);
        if (displayAll === true) {
          setDisplayAll(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };


  const displayAllNode = () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const edgeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.edge_source_id : supplyNetworkDataSourceID.current.edge_source_id );
        for (const nodeID of nodeSource.data.nodeID) {
          nodeSource.data.alpha[nodeID] = 1.0;
        }
        for (const edgeID of edgeSource.data.edgeID) {
          edgeSource.data.alpha[edgeID] = 0.7;
        }
        nodeSource.change.emit();
        edgeSource.change.emit();
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const displaySelectNode = (nodes) => {
    console.log(nodes);
    if (window.Bokeh) {
      try{
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const edgeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.edge_source_id : supplyNetworkDataSourceID.current.edge_source_id );
        for (const nodeID of nodeSource.data.nodeID) {
          if (nodes.includes(nodeID)) {
            nodeSource.data.alpha[nodeID] = 1;
          } else {
            nodeSource.data.alpha[nodeID] = 0.1;
          }
        }
        for (const edgeID of edgeSource.data.edgeID) {
          var start = edgeSource.data.start[edgeID];
          var end = edgeSource.data.end[edgeID];
          if (nodes.includes(start) && nodes.includes(end)) {
            edgeSource.data.alpha[edgeID] = 0.7;
          } else {
            edgeSource.data.alpha[edgeID] = 0.1;
          }
        }
        nodeSource.change.emit();
        edgeSource.change.emit();
      } catch ( error) {
        console.error("Error:", error);
      }
    }
  };

  const onDisplayAllSwitchChange = (checked) => {
    setDisplayAll(checked);
    if (checked) {
      displayAllNode();
    } else {
      var lasso_select = [];
      const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
      lasso_select = nodeSource.selected.indices;
      const nodes = [...new Set([...selectNode, ...lasso_select])];
      displaySelectNode(nodes);
    }
  };

  const handleDisplayForwardSupplyChain = async () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const requestData = { 'nodes': nodeSource.selected.indices,
          'direction': "forward",
          // 'step': 10
        }; // 要发送的数据
        const res = await fetch("http://127.0.0.1:5000/api/map/propagation", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData), // 将数据转为 JSON 字符串
        });
        const data = await res.json(); // 解析返回的 JSON 数据
        console.log(data.nodes);
        nodeSource.selected.indices = data.nodes;
        displaySelectNode(nodeSource.selected.indices);
        if (displayAll === true) {
          setDisplayAll(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const handleDisplayBackwardSupplyChain = async () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );

        const requestData = { 'nodes': nodeSource.selected.indices,
          'direction': "backward",
          'step': 10
        }; // 要发送的数据
        const res = await fetch("http://127.0.0.1:5000/api/map/propagation", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData), // 将数据转为 JSON 字符串
        });
        const data = await res.json(); // 解析返回的 JSON 数据
        console.log(data.nodes);
        nodeSource.selected.indices = data.nodes;
        displaySelectNode(nodeSource.selected.indices);
        if (displayAll === true) {
          setDisplayAll(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const handleDisplayAllDirectionSupplyChain = async () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        const requestData = { 'nodes': nodeSource.selected.indices,
          'direction': "all",
          'step': 10
        }; // 要发送的数据
        const res = await fetch("http://127.0.0.1:5000/api/map/propagation", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData), // 将数据转为 JSON 字符串
        });
        const data = await res.json(); // 解析返回的 JSON 数据
        console.log(data.nodes);
        nodeSource.selected.indices = data.nodes;
        displaySelectNode(nodeSource.selected.indices);
        if (displayAll === true) {
          setDisplayAll(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const handleClearSelection = () => {
    if (window.Bokeh) {
      try {
        const nodeSource = getDataSource( activateChartKey === '1' ? supplyChainMapDataSourceID.current.node_source_id : supplyNetworkDataSourceID.current.node_source_id );
        nodeSource.selected.indices = [];
        if (displayAll === false) {
          setDisplayAll(true);
        }
        displayAllNode();
      } catch (error) {
        console.error("Error:", error);
      }
    }
  }

  const tabItems = [
    {
      label: "Upstream and downstream supply chain",
      key: "1",
      content: (
        <Space>
          <Button type="primary" onClick={handleDisplayForwardSupplyChain} >Downstream supply chain</Button>
          <Button type="primary" onClick={handleDisplayBackwardSupplyChain}>Upstream supply chain</Button>
          <Button type="primary" onClick={handleDisplayAllDirectionSupplyChain}>Both</Button>
        </Space>
      )
    },
    {
      label: "Risk Propagation Analysis",
      key: "2",
      content: (
        <Space>
          <Button type="primary" onClick={forwardEffect}> Next Step Impact (forward) </Button>
          <Button type="primary" onClick={AllDirectionEffect}>Next Step Impact (bidirectional)</Button>
        </Space>
      )
    },
  ];

  return (
    <div>
      <Row>
        <Col span={15}>
          <Tabs defaultActiveKey='1' 
            style={{margin: "20px"}}
            items={tabItems.map((tab) => ({
              label: tab.label,
              key: tab.key,
              children: tab.content,
            }))}
          />
        </Col>
        <Col span={9}>
        <Space>
          <Switch 
            checkedChildren="Display All Nodes" 
            unCheckedChildren="Display Selected Nodes" 
            checked={displayAll}
            defaultChecked onChange={onDisplayAllSwitchChange} 
            style={{width: "150px", margin: "25px 0px 0px 0px"}}>
          </Switch>
          <Button type="primary" onClick={handleClearSelection}  style={{margin: "25px 0px 0px 0px"}}> Clear Selection </Button> 
        </Space>
        </Col>
      </Row>
      <Row>
        <Col span={6}>
          <Slider
            min = {0} max = {1} step={0.1}
            onChange={setEdgeAlpha} value={edgeAlpha}
          />
        </Col>
        <Col span={2}></Col>
        <Col span={4}>
          <b>
            Edge Alpha: {edgeAlpha}
          </b>
        </Col>
        <Col span={6}>
          <Slider
            min = {0} max = {1} step={0.1}
            onChange={setNodeAlpha} value={nodeAlpha}
          />
        </Col>
        <Col span={2}></Col>
        <Col span={4}>
          <b>
            Node Alpha: {nodeAlpha}
          </b>
        </Col>
      </Row>
      <Tabs
        defaultActiveKey={mapVisible.current ? '1' : '2'}
        activeKey={activateChartKey}
        type="card"
        size='small'
        style={{margin: "20px"}}
        items={[
          {label: 'Supply Chain Map', key: '1', children: ( <BokehChart 
                                                      chart_id='supplychainmap' 
                                                      bokehModel={supplyChainMap}/> ), disabled: !mapVisible.current},
          {label: 'Supply Network', key: '2', children: ( <BokehChart 
                                                        chart_id='supplynetwork' 
                                                        bokehModel={supplyNetwork}/> )},
        ]}
        onChange={(key) => setActivateChartKey(key)}
      />
      <List
        header={<b>Affected companies</b>}
        style={{margin: "20px"}}
        itemLayout="vertical"
        bordered
        dataSource={affectedCompanies}
        renderItem={(item) => (
          <List.Item
            onClick={() => {
              console.log("select ", item.name);
              setSelectedItem(item.nodeID);
            }}
            style={{
              cursor: 'pointer',
              backgroundColor: selectedItem === item.nodeID ? '#f0f0f0' : '#fff',
            }}>
            <Row>
              <Col span={2}> {item.nodeID} </Col>
              <Col span={8}> {item.name} </Col>
              <Col span={6}> {item.type} </Col>
            </Row>
          </List.Item>
        )}
      />
    </div>
  );
};

export default SupplyChainMap;
