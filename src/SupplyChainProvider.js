// SupplyChainContext.js
import React, { createContext, useState, useRef } from 'react';

export const SupplyChainContext = createContext();

const SupplyChainProvider = ({ children }) => {
  // 供应链数据上下文，负责管理供应商数据、供应关系数据以及对应的供应链地图和网络图数据
  const [supplierData, setSupplierData] = useState([]);
  const [supplyRelationData, setSupplyRelationData] = useState([]);
  const [supplyChainMap, setSupplyChainMap] = useState(null);
  const [supplyNetwork, setSupplyNetwork] = useState(null);
  // const [degreeDistribution, setDegreeDistribution] = useState(null);
  const [selectSupplyChainID, setSelectSupplyChainID] = useState(0);
  const [supplyChainMapDoc, setSupplyChainMapDoc] = useState(null);
  const [supplyNetworkDoc, setSupplyNetworkDoc] = useState(null);
  const [lastSupplyChainID, setLastSupplyChainID] = useState(null);
  const mapVisible = useRef(true);
  
  return (
    <SupplyChainContext.Provider 
    value={{supplierData, setSupplierData,
            supplyRelationData, setSupplyRelationData,
            supplyChainMap, setSupplyChainMap, 
            supplyNetwork, setSupplyNetwork,
            selectSupplyChainID, setSelectSupplyChainID,
            supplyChainMapDoc, setSupplyChainMapDoc,
            supplyNetworkDoc, setSupplyNetworkDoc,
            lastSupplyChainID, setLastSupplyChainID,
            mapVisible }}>
      {children}
    </SupplyChainContext.Provider>
  );
};

export default SupplyChainProvider;