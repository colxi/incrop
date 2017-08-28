let FORM = {
    validation : {
        pattern : {
            notEmpt        : '.*\S+.*',
            url             : 'https?://.+',
            hexColor        : '^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$',
            ipv4            : '((^|\.)((25[0-5])|(2[0-4]\d)|(1\d\d)|([1-9]?\d))){4}$'
        },
        title : {
            notEmpty    : 'Field Can\'t be empty.',
            url         : 'Must strart with http(s)...',
            hexColor    : 'Color must be a in Hexadecimal (#RRGGBB) ',
            ipv4        : 'Invalid Ip version 4 adress  xxx.xxx.xxx.xxx'
        }
    }
};

exports.default = FORM.validation;
