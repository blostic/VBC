/**
 * Created by piotr on 04.05.14.
 */

var execute_task = function(task){
    var func = eval('(' + task.code + ')');
    var data = eval(task.data);
    var res = {task_id : task.task_id };
    res.result = func(data);
    return res;
};
