// Changes XML to JSON
let _JSON = {
	parseXML: function(xml = document.createElement('xml') , convertCDATAtoTEXT = false) {
		// Create the return object
		let obj = {};

		if (xml.nodeType === 1) { // element
			// do attributes
			if (xml.attributes.length > 0) {
			obj['@attributes'] = {};
				for (let j = 0; j < xml.attributes.length; j++) {
					let attribute = xml.attributes.item(j);
					obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
				}
			}
		} else if (xml.nodeType === 3) { // text
			obj = xml.nodeValue;
		} else if (xml.nodeType === 4) { // CDATA_SECTION_NODE
			obj = xml.nodeValue;
		}

		// do children
		if (xml.hasChildNodes()) {
			for(let i = 0; i < xml.childNodes.length; i++) {
				let item = xml.childNodes.item(i);
				let nodeName = item.nodeName;
				if(convertCDATAtoTEXT && nodeName === '#cdata-section') nodeName = '#text';
				if (typeof(obj[nodeName]) === 'undefined')  obj[nodeName] = _JSON.parseXML(item, convertCDATAtoTEXT);
				else {
					if (typeof(obj[nodeName].push) === 'undefined') {
						let old = obj[nodeName];
						obj[nodeName] = [];
						obj[nodeName].push(old);
					}
					obj[nodeName].push(_JSON.parseXML(item, convertCDATAtoTEXT));
				}
			}
		}
		return obj;
	}
};

exports.default =  _JSON.parseXML;
