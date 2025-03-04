import React, {useState} from 'react';
import { Col, Row, Tabs, Divider} from 'antd';
import SupplierTable from './SupplierTable';
import SupplyChainMap from './SupplyChainMap';
import DataManager from './DataManager';
import SupplyChainProvider from './SupplyChainProvider';

const App = () => {
  const [selectNode, setSelectNode] = useState([]);
  const [activateKey, setActivateKey] = useState("2");

  const supplyVis = () => {
    return (
      <Row>
          <Col span={12}>
            <h1 style={{margin: "20px 0px 0px 20px"}}> Map and Network </h1>
            <SupplyChainMap
              selectNode={selectNode}
              setSelectNode={setSelectNode}
              activateKey={activateKey}
            >
            </SupplyChainMap>
          </Col>
          <Col span={12}>
            <h1 style={{margin: "20px 0px 0px 20px"}}> Supplier Information </h1>
            <div id="key supplier select">
              <SupplierTable 
                selectNode={selectNode}
                setSelectNode = { setSelectNode }
                activateKey={activateKey}>
              </SupplierTable>
            </div>
          </Col>
        </Row>
    );
  };

  const items = [
    {key: "1", label: "Supply Chain Visualize", content: (supplyVis()) },
    {key: "2", label: "Data Manage", content: (<DataManager setActivateKey={setActivateKey}/>)},
  ];

  return(
    <SupplyChainProvider>
      <Tabs 
        defaultActiveKey='2'
        activeKey={activateKey}
        size='large'
        style={{margin: "20px"}}
        items={items.map((tab) => ({
            label: tab.label,
            key: tab.key,
            children: tab.content,
          }))}
        onChange={(key) => setActivateKey(key)
        
        }
      />
    </SupplyChainProvider>
  );
};

export default App;
