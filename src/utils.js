export const indicators = ["OutDegreeCentrality", "BetweennessCentrality", "HarmonicCentrality", "CloseCentrality", "KatzCentrality"];

export const nodeAttr = [
    {key: "nodeID", type: "int", necessary: true},
    {key: "name", necessary: true, type: "string"},
    {key: "layer", necessary: false, type: "int"},
    {key: "longitude", necessary: false, type: "float"},
    {key: "latitude", necessary: false, type: "float"},
];

export const edgeAttr = [
    {key: "edgeID", type: "int", necessary: true},
    {key: "source", necessary: true, type: "string"},
    {key: "target", necessary: true, type: "string"},
];

export const getDataSource = ( source_id ) => {
    // console.log('source id: ', source_id);
    if ( source_id && window.Bokeh) {
        let dataSource = null;
        for (const doc of window.Bokeh.documents.slice().reverse()) {
            dataSource = doc.get_model_by_id(source_id);
            if (dataSource) {
                break;
            }
        }
        if (dataSource){
            return dataSource;
        } else {
            console.error("get Data Source failed");
            return null;
        }
    } else {
        console.error("window.Bokeh is null or source_id is null");
        return null;
    }
};

export const getDocBySource = ( source_id ) => {
    if ( source_id && window.Bokeh) {
        let doc = null;
        for (const d of window.Bokeh.documents.slice().reverse()) {
            if (d.get_model_by_id(source_id)) {
                doc = d;
                break;
            }
        }
        if (doc){
            return doc;
        } else {
            console.error("get Doc failed");
            return null;
        }
    } else {
        console.error("window.Bokeh is null or source_id is null");
        return null;
    }
};