import { Table, Select, Card, Space, Divider } from "antd";
import {indicators, nodeAttr} from "./utils";
import { useState, useEffect, useContext } from "react";
import { SupplyChainContext } from "./SupplyChainProvider";
import axios from "axios";
import BokehChart from "./BokehChart";
const { Option } = Select;

const SupplierTable = ({ setSelectNode, activateKey }) => {
    // 根据 selectedIndicator 进行排序
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedIndicator, setSelectedIndicator] = useState(indicators[0]);

    const { supplierData, setSupplierData, setSupplyRelationData, 
            selectSupplyChainID,
            lastSupplyChainID, degreeDistribution } = useContext(SupplyChainContext);


      useEffect(() => {
        // 请求供应链地图图表数据
        const fetchGraphData = async () => {
          try {
            const response = await axios.get(`http://127.0.0.1:5000/api/supplychain/${selectSupplyChainID}`);
            if (response.data.status === 'success') {
                console.log(response.data.nodes);
                console.log(response.data.edges);
                setSupplierData(response.data.nodes);
                setSupplyRelationData(response.data.edges);
                console.log("Success fetching Supply Chain data!");
            }
          } catch (error) {
            console.error("Error fetching Supply Chain data:", error);
          }
        };
    
        if (activateKey === "1") {
          // 如果上一次选择的供应链id为空或者不为空且与当前id不同，则重新请求图像
          if (lastSupplyChainID && lastSupplyChainID === selectSupplyChainID) {
            console.log('SupplyChainID未发生变化，不请求新的数据。');
          } else {
            fetchGraphData();
          }
        }
      }, [activateKey, selectSupplyChainID]);

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
                        defaultValue={indicators[0]} 
                        style={{ width: 200 }} 
                        onChange={handleIndicatorSelectChange} >
                        {indicators.map((indicators) => (
                        <Option key={indicators} value={indicators}>
                            {indicators}
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
                <Card title="Degree Distribution" style={{ width: 500 }}>
                    <BokehChart 
                        chart_id='degree_distribution' 
                        bokehModel={degreeDistribution}/>
                </Card>
            </Space>
        </div> 
    );
};

export default SupplierTable;