
var CALC = function (){

    this.something_change_in_one_roule = function(data, plugin, input_obj, score){
        var to_return = {
            changed: false,
            how_changed: false
        }

        //var score = new Function(data.value.eval)()
        
        if(score==undefined){
            return to_return
        }
        
        if(data.value[plugin] && data.value[plugin].blocked===true){ // IS BLOCKED
            if(data.value.decision!=undefined){
                if(data.value.decision==0){
                    to_return.changed = true
                    to_return.how_changed = false
                }else if(data.value.decision!=1 && score >= input_obj.config.score_threshold){
                    to_return.changed = true
                    to_return.how_changed = false
                }
            }else if(score < input_obj.config.score_threshold){
                to_return.changed = true
                to_return.how_changed = false
            }

        }else if(data.value[plugin] && data.value[plugin].blocked===false){ // IS UN BLOCKED
            if(data.value.decision!=undefined){
                if(data.value.decision==1){
                    to_return.changed = true
                    to_return.how_changed = true
                }else if(data.value.decision!=0 && score >= input_obj.config.score_threshold){
                    to_return.changed = true
                    to_return.how_changed = true
                }
            }else if(score >= input_obj.config.score_threshold){
                to_return.changed = true
                to_return.how_changed = true
            }
        }else{
            console.error("something went bad")
        }

        //console.log(data.value.ip + "\t" + to_return.changed + "\t" + to_return.how_changed + "\t" + score)

        return to_return
    }
}

module.exports = CALC
