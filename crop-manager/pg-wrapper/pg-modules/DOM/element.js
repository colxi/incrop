//
// usage example :
// element("#myElement").parent()
//
let DOM = {
    element : function(elem) {
        if(typeof elem === 'string') elem = document.querySelector(elem);
        if(!elem) elem = undefined;
        return  {
            /**
             * closest() Returns the closest matching element up the DOM tree (provided
             * element is a candidate).
             * @param  {DOM Element}            elem        Starting element
             * @param  {String}                 selector    Selector to match against
             *                                              (class, ID, data attribute, or tag)
             *
             * @return {DOM Element | null}                 Returns DOM ELEMENT or null if not match found
             */
            closest : function ( selector ) {
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

            },
            /**
             * parent() will return the closest element matching with the provided selector
             * without considering provided node ( like closest() does )
             * @param  {DOM element}            elem        Starting element
             * @param  {string}                 selector    Selector to match against
             *                                              (class, ID, data attribute, or tag)
             *
             * @return {DOM element | null}                 Returns DOM element or null if not match found
             */
            parent :function(selector){
                if( elem === undefined ) return undefined;
                elem = elem.parentNode;
                var selection = DOM.element.closest( selector);
                if(typeof selection === 'undefined') return null;
                else return selection;
            },
            /**
             * parents() will return an ascending ordered array, with all the parents
             * nodes for the provided DOM element, until BODY node is reached
             * @param  {DOM element}            elem    Starting element
             *
             * @return {Array}                          Returns an array
             */
            parents: function(_a) {
                if( elem === undefined ) return undefined;
                if(_a === undefined) _a = []; // initial call
                else _a.push(elem); // add current element
                // do recursion until BODY is reached
                if(elem.tagName !== 'BODY' ){
                    elem = elem.parentNode;
                    return DOM.element.parents(_a);
                }else return _a;
            },
            find : function(selector){
                if( elem === undefined ) return undefined;
                let selection = elem.querySelectorAll(selector);
                if(typeof selection === 'undefined') return null;
                else return selection;
            }
        };
    }
};

export default DOM.element;
