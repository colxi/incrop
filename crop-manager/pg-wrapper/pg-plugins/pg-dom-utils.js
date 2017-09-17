/*
* @Author: colxi.kl
* @Date:   2017-09-16 14:41:44
* @Last Modified by:   colxi.kl
* @Last Modified time: 2017-09-17 07:09:08
*/

/* globals pg */

// Execute when PG is ready pg.onready() ...
pg.ready(function(){
	/**
	 * closest() Returns the closest matching element up the DOM tree (provided
	 * element is a candidate).
	 * @param  {DOM Element}            elem        Starting element
	 * @param  {String}                 selector    Selector to match against
	 *                                              (class, ID, data attribute, or tag)
	 *
	 * @return {DOM Element | null}                 Returns DOM ELEMENT or null if not match found
	 */
	/*
	pg.registerPlugin( 'closest' , function ( selector ){
		if( elem === undefined ) return undefined;
		// Variables
		let firstChar = selector.charAt(0);
		let supports = 'classList' in document.documentElement;
		let attribute;
		let value;

	    // If selector is a data attribute, split attribute from value
	    if ( firstChar === '[' ) {
	        selector = selector.substr( 1, selector.length - 2 );
	        attribute = selector.split( '=' );

	        if ( attribute.length > 1 ) {
	            value = true;
	            attribute[1] = attribute[1].replace( /"/g, '' ).replace( /'/g, '' );
	        }
	    }

	    // Get closest match
	    for ( ; elem && elem !== document && elem.nodeType === 1; elem = elem.parentNode ) {
	        switch(firstChar){
	            // If selector is a class
	           case '.' :
	                if ( supports )  if ( elem.classList.contains( selector.substr(1) ) ) return elem;
	                else if ( new RegExp('(^|\\s)' + selector.substr(1) + '(\\s|$)').test( elem.className ) ) return elem;
	                break;
	            case '#' :
	                 if( elem.id === selector.substr(1) ) return elem;
	                 break;
	            case '[' :
	                if ( elem.hasAttribute( attribute[0] ) ) {
	                    if ( value && elem.getAttribute( attribute[0] ) === attribute[1] ) return elem;
	                    else return elem;
	                }
	                break;
	            default:
	                // If selector is a tag
	                if ( elem.tagName.toLowerCase() === selector )  return elem;
	                break;
	        }
	    }
	    return null;

	});
	*/
	pg.registerPlugin( 'showLoader' , function( text = ' ' ){
		// iterate provided array of elements
		for(let i = 0; i<this.length; i++){
			let elem = this[i];
			elem.setAttribute('pg-loading', text );
		}
		return this;
	});

	pg.registerPlugin( 'hideLoader' , function(){
		// iterate provided array of elements
		for(let i = 0; i<this.length; i++){
			let elem = this[i];
			elem.removeAttribute('pg-loading');
		}
		return this;
	});

	/**
	 * parent() will return the parent element
	 *
	 */
	pg.registerPlugin( 'parent' , function(){
		let collection= [];
		// iterate provided array of elements
		for(let i = 0; i<this.length; i++){
			let elem = this[i];
			// insert to resulting collection current element parent, or null if
			// item is not a DOM element
			collection.push( ( elem instanceof Element ) ? elem.parentNode : null );
		}
		return collection;
	});

	/**
	 * parents() will return an ascending ordered array, with all the parents
	 * nodes for the provided DOM element/s
	 *
	 * @param  {DOM element}            elem    Starting element/s
	 *
	 *
	 */
	pg.registerPlugin( 'parents' , function() {
		let collection= [];

		// iterate provided array of elements
		for(let i = 0; i<this.length; i++){
			let elem 	= this[i];
			// if current item is an element
			if(elem instanceof Element){
				// ascend in the DOM tree
				while( true ){
					// if has parent node
					if(elem.parentNode){
						// insert to collection parent node (if not inserted before)
						if(collection.indexOf( elem.parentNode ) === -1 ) collection.push(elem.parentNode);
						// assign parentNode as current element
						elem = elem.parentNode;
					}else break;
				}
			}
		}
		// done!
		return collection;
	});


	/**
	 * [find description]
	 * @param  {[type]} selector [description]
	 * @return {[type]}          [description]
	pg.registerPlugin( 'find' , function(selector) {
	    if( elem === undefined ) return undefined;
	    let selection = elem.querySelectorAll(selector);
	    if(typeof selection === 'undefined') return null;
	    else return selection;
	});
	 */

});
