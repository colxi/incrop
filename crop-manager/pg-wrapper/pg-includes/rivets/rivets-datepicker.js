/*
* @Author: colxi.kl
* @Date:   2017-09-17 23:13:02
* @Last Modified by:   colxi.kl
* @Last Modified time: 2017-09-18 04:41:39
*/

/* global rivets */

(function(){

	let datepicker_html = `
		<div class="pg-datepicker pg-text-center pg-padding-small">
			<div class="pg-row pg-padding-small">
				<span class="pg-col">{</span>
				<span class="pg-col pg-datepicker-date-year">Mes Año</span>
				<span class="pg-col">}</span>
			</div>
			<div class="pg-row pg-datepicker-weekdays">
				<span class="pg-col">Mo</span>
				<span class="pg-col">Tu</span>
				<span class="pg-col">We</span>
				<span class="pg-col">Th</span>
				<span class="pg-col">Fr</span>
				<span class="pg-col">Sa</span>
				<span class="pg-col">Su</span>
			</div>
			<div class="pg-row pg-datepicker-week">
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
			</div>
			<div class="pg-row pg-datepicker-week">
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
			</div>
			<div class="pg-row pg-datepicker-week">
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
			</div>
			<div class="pg-row pg-datepicker-week">
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
			</div>
			<div class="pg-row pg-datepicker-week">
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
				<span class="pg-col">-</span>
			</div>
	</div>
	`;

	rivets.binders['datepicker'] = {
		block:false,
		priority:5000,
		publishes: false,

		bind: function(el){
			if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : BIND' , 'color: green' );
			return el;
		},
		routine: function(el,value){
			let _showCalendar = function(event){ showCalendar(event.target, value) };
			// on focus call showcalendar providing the INPUT EVENT with focus, and its configuration (value)
			console.log('**********datepicker routine');
			el.removeEventListener('focus', _showCalendar);
			el.addEventListener('focus', _showCalendar);
			if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : ROUTINE' , 'color: orange' );
			//return el;
		},
		unbind: function(el){
			console.log('datepicker unbind!');
			if(rivets.imports.__debug__) console.log( '%c pg-element ' + el.getAttribute('pg-element') + ' : UNBIND' , 'color: red' );
		}
	};

	let showCalendar = function( input, config_custom = {} ){
		let config_default = {
			format : 'DD-MM-YYYY'
		};
		let config = Object.assign(config_default, config_custom);
		let seletedDate = false;
		if( input.value ){
			let tokens  = config.format.split('-');
			let parts= input.value.split('-');
			seletedDate = new Date( parts[tokens.indexOf('YYYY')] , parts[tokens.indexOf('MM')], parts[tokens.indexOf('DD')])  ;
		}

		console.log('show calendar for ' , input);
		// if datepicker is already in DOM remove it
		var datepicker_dom = document.getElementById('pg-datepicker-wrapper');
		if( datepicker_dom ) datepicker_dom.parentElement.removeChild( datepicker_dom );
		// and insert it again clean (use the following method to prevent RIVETS
		// destroy all binbdings in scope)
		var wrapper = document.createElement('div') ;
		wrapper.id = 'pg-datepicker-wrapper';
		wrapper.innerHTML = datepicker_html;
		document.body.appendChild( wrapper );

		var monthNames 		= [ 'January' , 'February', 'March', 'April',  'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		//var WeekDaysNames 	= [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday' , 'Saturday', 'Sunday' ];

		var today 			= new Date();
		var month 			= today.getMonth() + 1;
		var year 			= today.getYear();
		var monthName 		= monthNames[month-1];
		var dayNum 			= today.getDate();
		var monthStart  	= new Date(year ,  month  , 1).getDay();
		var monthDaysCount 	= new Date(year, month , 0).getDate();

		var monthStartCell 	= monthStart -1;
		var monthEndCell 	= monthStartCell + monthDaysCount -1;

		var monthCells = document.querySelectorAll('#pg-datepicker-wrapper .pg-datepicker-week .pg-col');
		for(let i = 0; i<monthCells.length; i++){
			if( i<monthStartCell || i>monthEndCell ) monthCells[i].innerHTML = '';
			else monthCells[i].innerHTML = i-monthStartCell+1;
		}

	};

})();
