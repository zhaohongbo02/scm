import React, { useEffect, useRef } from 'react';

const BokehChart = ( { bokehModel, chart_id } ) => {
    const divRef = useRef(null);

    useEffect(() => {
        if (bokehModel && divRef.current) {
            console.log("开始渲染");
            try {
                divRef.current.innerHTML = '';
                // 转换图表数据
                const orderedData = {};
                for (const key of bokehModel[1]) {
                    orderedData[key] = bokehModel[0]["doc"]["roots"][0]["attributes"][key];
                }
                bokehModel[0]["doc"]["roots"][0]["attributes"] = orderedData;
                window.Bokeh.embed.embed_item(bokehModel[0], divRef.current);
                console.log('window.Bokeh.documents.length', window.Bokeh.documents.length);
            } catch (error) {
                console.error('Error embedding Bokeh chart:', error);
            }
        }
    }, [bokehModel, chart_id]);

    return (
        <div id={chart_id} ref={divRef}></div>
    );
}

export default BokehChart;