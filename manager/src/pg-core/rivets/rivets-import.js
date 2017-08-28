/*
*
*  Experimental RIVETS IMPORT Binder
*  by Colxi - www.colxi.info
*
*  Main binders:
*  --------------
*  rivets.binders['model']  -> Imports the JS file and binds the imported object to element (and childs)
*  rivets.binders['view'] -> Imports the HTML file and renders inside the binded element.
*
*  Importer  Configuration
*  ------------------------
*  Use :
*  rivets.configure_importer({
*       baseUrl : (string) base url for models directory
*       baseUrl_Views : (string) base url for views directory
*       constructor : (string) name of the custom Module constructor
*       debug : (boolean) : enabled and disabled the on-screen bindings visualization and console debugging
*       onLoadController : (function) function to be notified each time a Model is loaded
*   }
*
*/

/* jsHint inline configuration : */
/* jshint undef: true, unused: false */
/* global System , rivets , sightglass */

// Declare imports container
rivets.imports          = {};
// Set default configuration directives
Object.defineProperty( rivets.imports , '__baseUrl__', {  value: './models/',  enumerable: false,  writable:true,  configurable: false });
Object.defineProperty( rivets.imports , '__baseUrl_Views__', {  value: './views/',  enumerable: false,  writable:true,  configurable: false });
Object.defineProperty( rivets.imports , '__constructor__', {  value: false,  enumerable: false,  writable:true,  configurable: false });
Object.defineProperty( rivets.imports , '__debug__', {  value: false,  enumerable: false,  writable:true,  configurable: false });
Object.defineProperty( rivets.imports , '__onLoadController__', {  value: undefined,  enumerable: false,  writable:true,  configurable: false });


/**
 * [configure_importer description]
 * @param  {[type]} configObj [description]
 * @param  {[type]} w         [description]
 * @param  {[type]} d         [description]
 * @return {[type]}           [description]
 */
rivets.configure_importer   = function(configObj, w, d){
    // allow activity in foreign window and document, if requested...
    var _window = ( typeof w === 'object' &&  w.hasOwnProperty('document') ) ? w : window;
    var _document = ( typeof d === 'object' &&  d.nodeName === '#document') ? d : document;
    // iterate provided config object
    for(var directive in ( configObj || {} ) ){
        if( !configObj.hasOwnProperty(directive) ) continue;
        // if config directive does not exist, create it
        if( !_window.rivets.imports.hasOwnProperty('__' + directive + '__') ){
            Object.defineProperty( _window.rivets.imports , '__' + directive + '__', { value: '', enumerable: false, writable:true, configurable: false });
        }
        // assign value to config directive
        _window.rivets.imports['__' + directive + '__'] = configObj[directive];
        // special behaviour for debug...
        if(directive === 'debug'){
            if( configObj.debug === false ) _document.getElementById('__rivets_import_debug_styles__').remove();
            else{
                // enable debuging...
                var stylesEl        = _document.createElement('STYLE');
                stylesEl.id         = '__rivets_import_debug_styles__';
                stylesEl.innerHTML = `
                    [pg\\:adapter]{
                        border:2px dotted grey;
                        position:relative;
                    }
                    [pg\\:adapter]::after{
                        display:block;
                        position:absolute;
                        top:0;right:0;
                        background-color:#000;
                        content:"\\21b5" " " attr(pg\\:adapter\\:\\:scopes);
                        padding:3px;
                        font-family:arial;
                        font-size:10px;
                        color:#fff;
                    }
                    body[pg\\:debug\\:\\:interactive] [pg\\:adapter]:hover{
                        border:1px dotted grey;
                        padding:10px;
                        margin:5px;
                        transition:all .2s ease-out;
                        position:relative;
                    }
                    body[pg\\:debug\\:\\:interactive] [pg\\:adapter]:hover::after{
                        display:block;
                        position:absolute;
                        top:0;right:0;
                        background-color:#000;
                        content:"\\21b5" " " attr(pg\\:adapter\\:\\:scopes);
                        padding:3px;
                        font-size:10px;
                        font-family:arial;
                        color:#fff;
                    }
                    body [pg-view][pg\\:import\\:error]{
                        position:relative !important;
                    }
                    body [pg-view][pg\\:import\\:error]:after{
                        position:absolute;
                        top:0px;
                        bottom:0px;
                        width:100%;
                        content:"Import Error ( " attr(pg-view) attr(pg-adapter) " )";
                        display:block;
                        background-color: red !important;
                        color:white;
                        height:100%;
                        padding:10px 0px;
                        min-height:10px;
                        font-size:10px;
                        text-align:center;
                    }
                `;
                _document.getElementsByTagName('HEAD')[0].appendChild(stylesEl);
            }
        }
    }
    return true;
};

rivets._.Util.resolveKeyPath = function(keypath, binding,  returnValue, generatePathIfNotExist){
    returnValue = ( returnValue === false ) ? false : true;
    generatePathIfNotExist = ( generatePathIfNotExist === true ) ? true : false;
    // break string keypath into each object level name
    var keypathArray = keypath.split(rivets.rootInterface);
    // must exist at least the model name and a property
    if(keypathArray.length < 2 ) throw new Error('rivets._.Util.resolveKeyPath(): Invalid keypath :' + keypath + '(Needs at least two levels model.property)');
    // resolve the reference to modelRoot
    var modelRoot =  binding.view.models[keypathArray[0]];
    if( modelRoot === undefined ) throw new Error('rivets._.Util.resolveKeyPath() : Model found in Keypath is not binded to Element View.');
    // remove model string from keypath array
    keypathArray.shift();
    // extract the name of the requewted property
    var key =  keypathArray.pop();
    // iterate keypathArray to obtain a Object reference to property parent
    var model = ( keypathArray.length === 1) ? keypathArray[0] : keypathArray.reduce( function(o,i){
        if(generatePathIfNotExist && o[i] === undefined) o[i] = {};
        return  o[i];
    }, modelRoot );
    return returnValue ? rivets.adapters[rivets.rootInterface].get(model,key) : {
        model : model,
        key : key
        //value : rivets.adapters[rivets.rootInterface].get(model,key)
    };
};



/* Assignation */
rivets.formatters.set = function(oldValue,newValue) {
    return function(event, obj, binding){
        //window.binding = binding;
        // var model = obj;
        var kp = rivets._.Util.resolveKeyPath(binding.keypath, binding, false);
        // set the value
        var adapter = rivets.adapters[rivets.rootInterface];
        adapter.set(kp.model, kp.key, newValue);
        return true;
    };
};
rivets.formatters['='] = rivets.formatters.set;


rivets.binders['element'] = {
    block:false,
    priority:5000,
    publishes: true,

    bind: function(el){
        if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : BIND' , 'color: green' );
        this.publish();
        return el;
    },
    routine: function(el,value){
        if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : ROUTINE' , 'color: orange' );
        return el;
    },
    unbind: function(el){
        if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : UNBIND' , 'color: red' );
    },
    getValue : function(el) {
        if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : GET-VALUE' , 'color: yellow' );
        return el;
    }
};


rivets.binders['view'] = {
    block: true,
    priority: 5000,
    bind: function(el) {
        //if( el.firstChild && el.firstChild.hasOwnProperty('getAttribute') && el.firstChild.getAttribute('pg:view') !== null ){
        if( this.nested ){
            if(rivets.imports.__debug__) console.log( '%c pg-view ' + this.nested.viewName + ' : NESTED UNBIND' , 'color: darkred' );
            el.innerHTML = this.view.initialHTML;
            this.unbind();
        }else{
            if(rivets.imports.__debug__) console.log( '%c pg-view ' + el.getAttribute('pg-view') + ' : BIND' , 'color: green' );
            this.view.initialHTML = el.innerHTML;
        }

        el.innerHTML = '<div>' + this.view.initialHTML + '</div>';
        return el;
    },
    routine : function(el,viewName){
        var self = this;
        if(!viewName) return false;
        viewName = String( viewName ).trim();

        // if is detected a previous import binding on element...
        if( self.nested ){
            if(viewName === self.nested.viewName ) return false; // ignore if VIEW is the same actually binded
            else{
                if(rivets.imports.__debug__) console.log( '%c pg-view ' + self.nested.viewName + ' : NESTED UNBIND' , 'color: darkred' );
                self.nested.unbind();
                self.nested= null;
                delete self.nested;
            }
        }
        if(rivets.imports.__debug__) console.log( '%c pg-view ' + viewName + ' : ROUTINE' , 'color: orange' );

        el.firstChild.setAttribute( 'pg:view' , viewName );
        el.setAttribute('pg-loading', 'true');
        el.removeAttribute('pg:import:error');
        var path = rivets.imports.__baseUrl_Views__+ viewName + '.html';
        var done = false;
        var _html = new XMLHttpRequest();
        _html.overrideMimeType('text/html');
        _html.open('GET', path , true);
        _html.onload = _html.onreadystatechange = function () {
            if ( !done && _html.readyState === 4 && _html.status ) {
                done = true;
                el.removeAttribute('pg-loading');
                // free memory, explicit  listener removal;
                el.firstChild.innerHTML = _html.responseText;
                if(rivets.imports.__debug__) console.log( '%c pg-view ' + viewName + ' :  NESTED BIND' , 'color: lightgreen' );

                self.nested = rivets.bind(el.firstChild, self.view.models);
                self.nested.viewName = viewName;

                // if callback  was setted, execute it!
                if(el.getAttribute('pg-on-ready')){
                    rivets._.Util.resolveKeyPath( el.getAttribute('pg-on-ready'), self )(viewName);
                }
                _html.onload = _html.onreadystatechange = null;
            }
        };
        _html.onerror = function(err){
            el.removeAttribute('pg-loading');
            el.setAttribute('pg:import:error', err.target.status);
            if(rivets.imports.__debug__) console.log( '%c pg-view ' + viewName + ' :  ERROR LOADING VIEW' , 'color: orangered' );
        };
        _html.send(null);
    },
    unbind: function(el) {
        if(rivets.imports.__debug__) console.log( '%c pg-view ' + el.getAttribute('pg-view') + ' : UNBIND' , 'color: red' );
        this.nested.unbind();
        this.nested =  null;
        delete this.nested;
        //this.unbind();
        //var modelName = this.el.removeAttribute('pg-controller:bind');
    },
    update: function(el) {
        if(rivets.imports.__debug__) console.log( '%c pg-view ' + el.getAttribute('pg-view') + ' : UPDATE' , 'color: yellow' );
        //this.unbind();
        //var modelName = this.el.removeAttribute('pg-controller:bind');
    },
};

/**
 * [model description]
 * @type {[type]}
 */
rivets.binders['adapter'] = {
    block: true,
    priority: 4000,
    bind: function(el) {
        //if( el.firstChild && el.firstChild.hasOwnProperty('getAttribute') && el.firstChild.getAttribute('pg:adapter') !== null ){
        if( this.nested ){
            if(rivets.imports.__debug__) console.log( '%c pg-adapter ' + self.nested.modelName + ' : NESTED UNBIND' , 'color: darkred' );
            el.innerHTML = this.view.initialHTML;
            this.unbind();
            //throw new Error('Element has already been binded to another import. Unbind first.');
        }else{
            this.view.initialHTML = el.innerHTML;
            if(rivets.imports.__debug__) console.log( '%c pg-adapter ' + el.getAttribute('pg-adapter') + ' : BIND' , 'color: green' );
        }

        el.innerHTML = '<div>' + this.view.initialHTML + '</div>';
        return el;
    },

    routine: function(el,modelName){
        modelName = String( modelName ).trim();
        var self = this;
        // if is detected a previous import binding on element...
        if( el.firstChild.getAttribute( 'pg:adapter' ) !== null ){
            var currentModel = el.firstChild.getAttribute( 'pg:adapter' );
            //var viewId = el.firstChild.getAttribute( 'pg:adapter::id' );
            // ignore if MODEL is the same actually binded
            if(modelName === currentModel ) return false;
            else{
                // if diferent ...unbind previous import binding and destroy view
                if(rivets.imports.__debug__) console.log( '%c pg-adapter ' + self.nested.modelName + ' : NESTED UNBIND' , 'color: darkred' );
                self.nested.unbind();
                self.nested = null;
                delete self.nested;
                //el.firstChild.innerHTML = this.view.initialHTML;
            }
        }
        if(rivets.imports.__debug__) console.log( '%c pg-adapter ' + modelName + ' : ROUTINE' , 'color: orange' );
        el.firstChild.setAttribute( 'pg:adapter' , modelName );
        el.firstChild.setAttribute( 'pg:adapter::scopes' , modelName);

        // import CONTROLLER module if setted &  controller NOT already loaded
        if(modelName.length && !rivets.imports.hasOwnProperty(modelName) ){
            el.setAttribute('pg-loading', 'true');
            System.import( rivets.imports.__baseUrl__ + modelName + '.js' ).then(function(controller){
                // create CONTROLLER module instance
                controller = rivets.imports[modelName] = controller.default;
                // assign non enumerable meta property NAME

                // flag to run constructor if method exists in imported object
                var initialize = false;
                if( rivets.imports.__constructor__ !== undefined &&
                    typeof rivets.imports[modelName][rivets.imports.__constructor__] === 'function'  ) initialize = true;

                el.removeAttribute('pg-loading');
                _bind(el, modelName, initialize);
            });
        }else{
            if(rivets.imports.__debug__) console.log('pg-adapter : The adapter "'+modelName+'" is cached. Using cache');
            _bind( el, modelName , false); // already loaded, bind but not run constructor
        }
        // INTERNAL WRAPPER BINDER
        function _bind(el, modelName, initializeModel){

            function parents(element, _array) {
                if(element.parentNode===null) window.a = element;
                if(_array === undefined) _array = []; // initial call
                else _array.push(element); // add current element
                // do recursion until HTML is reached
                return (element.tagName !== 'BODY' ) ? parents(element.parentNode, _array) : _array;
            }

            function _constructed(){
                if(!modelName) return false; // patch, to prevent error caused when no model name is attached
                delete rivets.imports[modelName][rivets.imports.__constructor__]; // ensure one time execution
                if(typeof rivets.imports.__onLoadController__ === 'function') rivets.imports.__onLoadController__(modelName);

                if(el.getAttribute('pg-on-ready')){
                    rivets._.Util.resolveKeyPath( el.getAttribute('pg-on-ready'), {view:self.nested} )(currentModel);
                }
                return true;
            }

            // prepare binding model object
            var bindedObj = {};
            bindedObj[modelName] = rivets.imports[modelName];

            // include parent elements, binding models to element
            var _p = parents(el);
            var scopesList = modelName;
            for(var i =0; i<_p.length;i++){
                var parentModel_name = _p[i].getAttribute('pg:adapter');
                if(parentModel_name !== null){
                    bindedObj[parentModel_name] = rivets.imports[parentModel_name];
                    scopesList += ' ' + parentModel_name;
                }
            }
            el.firstChild.setAttribute( 'pg:adapter::scopes' , scopesList );

            if(rivets.imports.__debug__) console.log( '%c pg-adapter ' + modelName + ' : NESTED BIND' , 'color: lightgreen' );

            // do the bindings!
            self.nested =  rivets.bind( el.firstChild, bindedObj );
            self.nested.modelName = modelName;

            // if has custom constructor/igniter should be executed... bunding scope to model object
            if(initializeModel){
                if(rivets.imports.__debug__) console.info('pg-adapter : Executing '+modelName+' constructor.');
                let _c = rivets.imports[modelName][rivets.imports.__constructor__].call( rivets.imports[modelName] );
                if( typeof _c === 'object' && typeof _c.then === 'function'){
                    if(rivets.imports.__debug__) console.info('pg-adapter : Detected Promise in '+modelName+' Constructor. Waiting resolution...');
                    return _c.then( function(){ _constructed() });
                }else{
                    return _constructed();
                }
            }else return _constructed();
        }

        return void 0;
    },

    unbind: function(el) {
        if(rivets.imports.__debug__) console.log( '%c pg-adapter ' + el.getAttribute('pg-adapter') + ' : UNBIND' , 'color: red' );
        this.nested.unbind();
        this.nested = null;
        delete this.nested;
        //this.unbind();
        //var modelName = this.el.removeAttribute('pg-controller:bind');
    },

    update: function(models) {
        if(rivets.imports.__debug__) console.log('***** pg-controller UPDATE ***** ');
        //var _ref1;
        //return (_ref1 = this.nested) !== null ? _ref1.update(models) : void 0;
    }
};


