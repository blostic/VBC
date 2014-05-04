'use strict';

angular.module('vcApp')
    .factory('Slave', function($http, $cookieStore) {
        return {
            execute_task : function(task){
                var func = eval('(' + task.code + ')');
                var data = eval(task.data);
                var res = {};
                res.task_id = task.task_id;
                res.result = func(data);
                return res;
            }
        };
    });