//
// usage example :
// element("#myElement").parent()
//
let DOM = {
    get : function( selector ){ return ( selector === undefined ) ? undefined : document.querySelectorAll(selector) },
};

export default DOM.get;
