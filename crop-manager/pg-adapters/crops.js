/* global  pg */
'use strict';

var crops = {
	pg_constructor: function __constructor() {

	},


	location: 'crops/list',

	initialize: function initialize() {
		crops.list.initialize();
	},

	list: {
		target: null,

		page: {
			current 	: 1, // current page
			total 		: 1, // total pages
			limit 		: 5, // limit of items
			order 		: 'DESC',
			sortBy 		: 'id',
			items 		: [],
			count: async function count() {
				let cropList = await pg.models.crops.page(0);
				return crops.list.page.total = Math.ceil(cropList.length / crops.list.page.limit);
			},
			update: async function update() {
				await crops.list.page.count();
				await crops.list.page.set(crops.list.page.current || 1);
				return true;
			},
			set: async function set(num) {
				let modifier = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

				num = num + modifier;
				// validate pageNum
				if (typeof num !== 'number' || num < 1) num = 1;
				else if (num > crops.list.page.total) num = await crops.list.page.count();
				crops.list.page.current = Math.floor(num);

				crops.list.page.items = await pg.models.crops.page(crops.list.page.current, crops.list.page.limit);
				return true;
			}
		},

		initialize: async function initialize() {
			let mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'insert';

			await crops.list.page.set(1);
			await crops.list.show();
			return true;
		},

		show: async function show() {
			await crops.list.page.update();
			crops.location = 'crops/list';
			return true;
		},

		show_deleteCategoryDialog: function show_deleteCategoryDialog(id) {
			crops.list.target = pg.models.crops.get(id);
			crops.location = 'crops/list_delete';
		},

		delete_category: function delete_category(id) {
			pg.models.crops.delete(id);
			crops.list.show();
		}
	},

	form: {
		active: 'categoryDeclarationForm',
		mode: 'insert', // | update
		error: false,
		title: {
			insert: 'New Category :',
			update: 'Edit Category :'
		},

		UI: {
			categoryDeclarationForm: null,
			categoryName: null
		},

		Data: {},

		initialize: function initialize(id = 'new') {
			if (id === 'new') {
				// INSERT MODE DETECTED ... generate new Category
				crops.form.mode = 'insert';
				crops.form.Data = pg.models.crops.new();
			} else {
				// EDIT MODE DETECTED! ... get Category Data
				var category = pg.models.crops.get(id);
				if (category === -1) throw new Error('crops.form.initialize(): Can\'t find Category with ID : ' + id);
				crops.form.mode = 'update';
				crops.form.Data = category;
			}

			crops.form.error = false;
			crops.location = 'crops/form';
			crops.form.show_categoryDeclarationForm();
			return true;
		},

		show_categoryDeclarationForm: function show_categoryDeclarationForm() {
			crops.form.active = 'categoryDeclarationForm';
		},

		validate_categoryDeclarationForm: function validate_categoryDeclarationForm() {
			pg.log('crops.form.validate_categoryDeclarationForm(): Validating Category Declaration...');
			// reset previous form validations
			crops.form.error = false;
			crops.form.UI.categoryName.setCustomValidity('');
			// validate form

			crops.form.Data.name = (crops.form.Data.name || '').trim().toLowerCase();

			if (!crops.form.UI.categoryDeclarationForm.checkValidity()) {
				pg.log('crops.form.validate_categoryDeclarationForm(): Form validation failed...');
				crops.form.error = 'Some fields require your attention.';
				return false;
			}
			// show loader
			pg.loader(crops.form.UI.categoryDeclarationForm).show();
			//
			// validation : duplicated name
			//
			if (pg.models.crops.getByName(crops.form.Data.name) !== -1) {
				// if has same ID as duplicated, means is updating entry.... ignore and continue
				if (pg.models.crops.getByName(crops.form.Data.name).id !== crops.form.Data.id) {
					pg.log('crops.form.validate_categoryDeclarationForm(): Name validation failed...');
					crops.form.error = 'Category name already exist.';
					crops.form.UI.categoryName.setCustomValidity('Category name already exist.');
					pg.loader(crops.form.UI.categoryDeclarationForm).hide();
					return false;
				}
			}
			// not duplicated! save...
			pg.models.crops.save({
				id: crops.form.Data.id,
				name: crops.form.Data.name,
				count: 0
			}).then(function(r) {
				//  hide loader
				pg.loader(crops.form.UI.categoryDeclarationForm).hide();
				// DONE! display ending message!
				crops.location = 'crops/form_completed';
			});
			return true;
		}
	}
};

module.exports = crops;
//# sourceMappingURL=crops.js.map
