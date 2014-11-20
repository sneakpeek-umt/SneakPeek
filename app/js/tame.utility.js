/*
Evin Ozer
11/19/2014
*/

TAME.Utility = {
	generate_random_number: function(min, max) {
        return Math.random() * (max - min) + min;
    },

    generate_random_values: function(num_values, num_repeat, as_hex) {
        var values = [];
        for (var i = 0; i < num_values*num_repeat; i++) {
            value = Math.random();
            if (as_hex === true) {
                value = (value * 255).toString(16);
            }
            values.push(value);
        }

        return values;
    },
}