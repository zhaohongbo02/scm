import React from 'react';
import { Cascader } from 'antd';

const options = [
  {
    label: '分系统',
    value: 'subsystem',
  },
  {
    label: '子系统或单机',
    value: 'stand-alone'
  },
  {
    label: '设备或部组件（零组件）',
    value: 'component',
  },
  {
    label: '基础产品',
    value: 'basic',
    children: [
      {
        label: '机电产品',
        value: 'electromechnaical',
      },
      {
        label: '军用关键材料',
        value: 'military'
      },
      {
        label: '电子元器件',
        value: 'electronic'
      }
    ],
  },
];

const ProductTypeSelect = ({ setSelectProductType }) => {
  const onChange = (value) => {
    console.log(value);
    // 设置选择的产品类型
    if (value.length === 0) {
      setSelectProductType("All");  // 没有选择产品类型，所以为全部产品类型
    } else {
      var selectType = new Array([]);
      for(const item of value) {
        selectType.push(item[item.length-1]);
      }
      if (selectType.includes("basic")) {
        selectType = selectType.filter(item => item !== "basic");
        selectType = selectType.concat(['electromechnaical', 'military', 'electronic']);
      }
      
      selectType.forEach((item, index, array) => {
        if (item === 'component') {
          array[index] = '设备或部组件（零组件）';
        } else if (item === 'subsystem') {
          array[index] = '分系统';
        } else if (item === 'stand-alone') {
          array[index] = '子系统或单机';
        } else if (item === 'electromechnaical') {
          array[index] = '机电产品';
        } else if (item === 'military') {
          array[index] = '军用关键材料';
        } else if (item === 'electronic') {
          array[index] = '电子元器件';
        }
      });
      console.log(selectType);
      setSelectProductType(selectType);
    }
  };

  return (
    <div>
      <Cascader
        options={options}
        onChange={onChange}
        placeholder="请选择"
        multiple
        maxTagCount="responsive"
      />
    </div>
  )
};
export default ProductTypeSelect;