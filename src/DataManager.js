import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Upload, Button, Table, Row, Col, Form, message, Input, Space, Popover, Modal, Divider} from 'antd';
import { UploadOutlined, DeleteOutlined, EditOutlined, InfoCircleOutlined, MonitorOutlined } from '@ant-design/icons';
import { nodeAttr, edgeAttr, indicators } from './utils';
import { SupplyChainContext } from './SupplyChainProvider';

const { TextArea } = Input;

const FileUploader = ({attributes, validateHeaders, rowKey, tableData, setTableData}) => {
  // const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  
  // 生成表格列配置
  const generateColumns = (headers) => {
    let sortedObj = [];
    for (const attr of attributes) {
      if (headers.includes(attr.key)) {
        sortedObj.push(attr.key);
      }
    }
    for (const header of headers) {
      if (!sortedObj.includes(header)) {
        sortedObj.push(header);
      }
    }
    return sortedObj.map(header => ({
      title: header,
      dataIndex: header,
      key: header,
      width: 100,
    }));
  };

  useEffect(() => {
    if (tableData !== null) {
      if (tableData.length > 0) {
        setColumns(generateColumns(Object.keys(tableData[0])));
      } 
    }
  }, [tableData]);

  // 处理文件上传
  const handleFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // 解析CSV
        Papa.parse(e.target.result, {
          header: true,
          complete: (result) => {
            const headers = result.meta.fields || [];
            console.log(headers);
            if (validateHeaders(headers)) {
              // 确保最后一行有数据，如果为空则删除
              console.log(result.data[result.data.length - 1]);
              if (Object.keys(result.data[result.data.length - 1]).length <  attributes.length) {
                result.data.pop();
              }
              setTableData(result.data);
              console.log(result.data);
              resolve(true);
            } else {
              message.error('Invalid file format, please check the file and try again!');
              resolve(false);
            }
          }
        });
      };
      reader.readAsText(file);
    });
  };

  const handleCancle = () => {
    setTableData(null);
    setColumns([]);
  };

  return (
    <div>
      <Space>
        <Upload
          accept=".csv"
          beforeUpload={async (file) => {
            const isValid = await handleFile(file);
            return isValid ? false : Upload.LIST_IGNORE; // 阻止上传
          }}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Upload CSV file</Button>
        </Upload>
        <Button type="primary" onClick={handleCancle}>
          Clear
        </Button>
      </Space>
      <Table
        bordered={true}
        columns={columns}
        dataSource={tableData}
        rowKey={rowKey}
        size="small"
        style={{ marginTop: 20 }}
        // pagination={{ pageSize: 10, }}
        scroll={{ y: 400, x: 100}}
      />
    </div>
  );
};

const DataManager = ({ setActivateKey }) => {
  const [nodeFileContent, setNodeFileContent] = useState([]);
  const [edgeFileContent, setEdgeFileContent] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplyChainList, setSupplyChainList] = useState([]);
  const [deleteSupplyChainID, setDeleteSupplyChainID] = useState(null);
  const [updatingSupplyChainID, setUpdatingSupplyChainID] = useState(null);
  const { selectSupplyChainID, setSelectSupplyChainID, mapVisible } = useContext(SupplyChainContext);
  // 获取供应链列表
  useEffect(() => {
    const getSupplyChainList = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/supplychain/list`);
        setSupplyChainList(response.data);
        console.log(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    getSupplyChainList();
  }, []);

  const handleDeleteSupplyChain = async () => {
    const supplyChainID = deleteSupplyChainID;
    axios.delete(`http://127.0.0.1:5000/api/supplychain/${supplyChainID}`)
    .then((response) => {
      if (response.data.status === 'success') {
        axios.get('http://127.0.0.1:5000/api/supplychain/list').then((response) => {
          setSupplyChainList(response.data);
        });
        console.log(response.data.message);
        message.success('Delete successfully');
      }
    })
    .catch((error) => {
      console.error('Error deleting file:', error);
      message.error('Delete failed, please try again later!');
    });
  };

  const onDeleteSupplyChain = (chainID) => {
    setDeleteSupplyChainID(chainID);
    setIsDeleteModalOpen(true);
  };
  
  const handleDeleteOk = () => {
    setIsDeleteModalOpen(false);
    handleDeleteSupplyChain();
  };
  
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setDeleteSupplyChainID(null);
  };

  const ProcessNodeData = (nodes) => {
    // 将节点数据属于indicator的数据删除
    console.log('处理节点数据', nodes);
    const nodeData = nodes.map((node) => {
      const nodeCopy = {...node};
      for (const indicator of indicators) {
        if (nodeCopy.hasOwnProperty(indicator)) {
          delete nodeCopy[indicator];
        }
      }
      return nodeCopy;
    });
    console.log(nodeData);
    return nodeData;
  };

  const onUpdateSupplyChain = async (chainID) => {
    setUpdatingSupplyChainID(chainID);
    const response = await axios.get(`http://127.0.0.1:5000/api/supplychain/${chainID}`);
    if (response.data.status === 'success') {
      console.log('预修改供应链的点、边数据');
      console.log(response.data.nodes);
      console.log(response.data.edges);
      setNodeFileContent(ProcessNodeData(response.data.nodes));
      setEdgeFileContent(response.data.edges);
    }
  };

  const onMonitorSupplyChain = async (chainID) => {
    setUpdatingSupplyChainID(null);
    const response = await axios.get(`http://127.0.0.1:5000/api/supplychain/${chainID}`);
    if (response.data.status === 'success') {
      console.log('查看供应链的点、边数据');
      console.log(response.data.nodes);
      console.log(response.data.edges);
      setNodeFileContent(response.data.nodes);
      setEdgeFileContent(response.data.edges);
    }
  };

  const checkNodeFile = (header) => {
    // 检查节点文件是否符合要求，包含必要字段
    const nodeFileKeys = header;
    const necessaryKeys = nodeAttr.filter((attr) => attr.necessary).map((attr) => attr.key);
    for (const key of necessaryKeys) {
      if (!nodeFileKeys.includes(key)) {
        return false;
      }
    }
    return true;
  };
  
  const checkEdgeFile = (header) => {
    // 检查边文件是否符合要求，包含必要字段
    const edgeFileKeys = header;
    const necessaryKeys = edgeAttr.filter((attr) => attr.necessary).map((attr) => attr.key);
    for (const key of necessaryKeys) {
      if (!edgeFileKeys.includes(key)) {
        return false;
      }
    }
    return true;
  };

  const supplyChainListColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 100 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 200, ellipsis: true, tooltip: true },
    { title: '# of Nodes', dataIndex: 'nodes', key: 'nodes', width: 150 },
    { title: '# of Edges', dataIndex: 'edges', key: 'edges', width: 150 },
    { title: 'Has Lat/Lon', dataIndex: 'has_latlon', key: 'has_latlon', width: 150 },
    { title: 'Has Layer', dataIndex: 'has_layer', key: 'has_layer', width: 150 },
    { title: 'Create Time', dataIndex: 'created_at', key: 'created_at', width: 180 },
    { title: 'Update Time', dataIndex: 'updated_at', key: 'updated_at', width: 180 },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (_, record) => (
      <Space>
        <button onClick={() => onMonitorSupplyChain(record.id)}>
          <MonitorOutlined />
        </button>
        <button onClick={() => onUpdateSupplyChain(record.id)}>
          <EditOutlined />
        </button>
        <button onClick={() => onDeleteSupplyChain(record.id)}>
          <DeleteOutlined />
        </button>
      </Space>
    ), width: 100},
  ];

  const SupplyChainForm = () => {
    const [form] = Form.useForm();
    // 设置正在更新的供应链后，将其名称和描述设置为对应输入框的值
    useEffect(() => {
      if (updatingSupplyChainID !== null) {
        const supplyChain = supplyChainList.find(sc => sc.id === updatingSupplyChainID);
        if (supplyChain) {
          form.setFieldsValue({
            scname: supplyChain.name,
            scdescription: supplyChain.description,
          });
        }
      } else {
        form.setFieldsValue({
          scname: '',
          scdescription: '',
        });
      }
    }, [updatingSupplyChainID, supplyChainList, form, supplyChainList, updatingSupplyChainID]);

    const onCancleUpdate = () => {
      setUpdatingSupplyChainID(null);
    };
  
    const handleSubmit = async (values) => {
      // 提交供应链表单
      console.log('提交供应链表单');
      try {
        let response = null;
        const requestData = {
          name: values.scname,
          description: values.scdescription,
          nodes: nodeFileContent,
          edges: edgeFileContent
        };
        if (updatingSupplyChainID === null) {
          response = await axios.post('http://127.0.0.1:5000/api/supplychain/create', requestData);
        }
        else {
          response = await axios.put(`http://127.0.0.1:5000/api/supplychain/${updatingSupplyChainID}`, requestData);
        }
        // 检查后端返回的状态
        if (response.status === 200) {
          message.success('Submit successfully!');
          form.resetFields(); // 提交成功后重置表单
          setUpdatingSupplyChainID(null);
          axios.get('http://127.0.0.1:5000/api/supplychain/list').then((response) => {
            setSupplyChainList(response.data);
          }); // 更新数据
        } else {
          message.error('Submit failed, please try again later!');
        }
      } catch (error) {
        message.error('Submit failed, please try again later!');
        console.error(error);
      }
    };
    // 新建或修改供应链的表单
    return (
      <div>
        <Form
          name="basic"
          form={form}
          labelCol={{ span: 8, }}
          wrapperCol={{ span: 16, }}
          style={{ maxWidth: 600, }}
          initialValues={{ remember: true, }}
          autoComplete="off"
          onFinish={handleSubmit}
        >
          
          <Form.Item
          label={updatingSupplyChainID === null ? null : "Supply Chain ID" }
          >
          {updatingSupplyChainID === null ? 
            (<div></div>): 
              (<div> {updatingSupplyChainID} </div>)}
          </Form.Item>
          <Form.Item
            label="Name"
            name="scname"
            rules={[ { required: true,
                message: 'Please input SupplyChainName!', },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Description"
            name="scdescription"
            rules={[ { required: false,
                message: 'Please input SupplyChain Description!',
              }, ]}
          >
            <TextArea rows={4} placeholder="Max length is 100" maxLength={100} />
          </Form.Item>
          <Form.Item label={null}>
            <Space>
              <Button 
                type="primary"
                htmlType="submit"
                >
                Submit
              </Button>
              <Button htmlType="button" onClick={onCancleUpdate}>
                Cancel
              </Button>
            </Space>
            
          </Form.Item>
        </Form>
      </div>
    );
  };

  const rowSelection = {
    type: 'radio',
    onChange: (selectedRowKeys, selectedRows) => {
      console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
      console.log(selectedRows[0]);
      setSelectSupplyChainID(selectedRows[0].id);
      if (selectedRows[0].has_latlon === 'YES') {
        mapVisible.current = true;
      } else {
        mapVisible.current = false;
      }
    },
  };

  return (
    <div>
      <Modal
        title='Delete Confirmation'
        open={isDeleteModalOpen}
        onOk={handleDeleteOk}
        onCancel={handleDeleteCancel}
      >
        Confirm to delete supply chain {deleteSupplyChainID}?
      </Modal>

      <h2> Supply Chain List </h2>
      <Button type='primary' onClick={() => {
        if (selectSupplyChainID !== 0) {
          setActivateKey('1');
        } else {
          message.warning('Please select a supply chain from the table!');
        }
      }} >
        Select To Visualize
      </Button>
      <br/>
      <br/>
      <Table
        tableLayout='fixed'
        columns={supplyChainListColumns}
        rowSelection={rowSelection}
        dataSource={supplyChainList.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          nodes: item.nodes,
          edges: item.edges,
          has_latlon: (item.has_latlon? 'YES': 'NO'),
          has_layer: (item.has_layer? 'YES': 'NO'),
          created_at: new Date(item.created_at).toLocaleString(),
          updated_at: new Date(item.updated_at).toLocaleString(),
        }))}
        rowKey='id'
      />

      <h2> New Supply Chain </h2>
      <Row style={{ margin: '20px 0' }}>
        <Col span={8}>
          <Space>
            <h3> Supply chain Node data file </h3>
            <Popover 
              content={
                <div>
                  <b> The name of the required data item must be consistent with the key! </b>
                  <Table
                    pagination={false}
                    size="small"
                    columns={Object.keys(nodeAttr[0]).map(header => ({
                      title: header,
                      dataIndex: header,
                      key: header,
                    }))}
                    dataSource={nodeAttr.map(item => ({
                      key: item.key,
                      description: item.description,
                      type: item.type,
                      necessary: item.necessary? 'YES' : 'NO'
                    }))}
                  ></Table>
                </div>
                  
              }
              trigger="click"
            >
              <InfoCircleOutlined/>
            </Popover>
          </Space>
          <FileUploader
            attributes={nodeAttr} 
            validateHeaders={checkNodeFile} 
            rowKey='nodeID'
            tableData={nodeFileContent}
            setTableData={setNodeFileContent}
            />
        </Col>
        <Col span={1}>
        <Divider type="vertical" style={{ height: '100%' }} />
        </Col>
        <Col span={8}>
          <Space>
            <h3> Supply chain Edge data file </h3>
            <Popover 
              content={
                <div>
                  <b> The name of the required data item must be consistent with the key! </b>
                  <Table
                    pagination={false}
                    size="small"
                    columns={Object.keys(edgeAttr[0]).map(header => ({
                      title: header,
                      dataIndex: header,
                      key: header,
                    }))}
                    dataSource={edgeAttr.map(item => ({
                      key: item.key,
                      description: item.description,
                      type: item.type,
                      necessary: item.necessary? 'YES' : 'NO'
                    }))}
                  ></Table>
                </div>
              }
              trigger="click"
            >
              <InfoCircleOutlined/>
            </Popover>
          </Space>
          <FileUploader 
            attributes={edgeAttr}
            validateHeaders={checkEdgeFile} 
            rowKey='edgeID'
            tableData={edgeFileContent}
            setTableData={setEdgeFileContent}
          />
        </Col>
        <Col span={7}>
          <br/>
          <br/>
          <SupplyChainForm
            setSupplyChainList={setSupplyChainList}
          />
          
        </Col>
      </Row>

    </div>
  );
};

export default DataManager;
