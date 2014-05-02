'use strict';

angular.module('vcApp')
    .factory('Slave', function($http, $cookieStore) {
        return {
            execute_task : function(task){
                var func = eval('(' + task.function + ')');
                var data = eval(task.data);
                var res = {};
                res.result = func(data);
                return res;

            }
        };
    });