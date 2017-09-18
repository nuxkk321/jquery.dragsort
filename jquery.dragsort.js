/*!
 * dragsort v0.1
 * update 20170728
 */
(function($) {
    "use strict";
    var plugin_name='dragsort';
    if(typeof($.fn[plugin_name])=='function'){
        return false;
    }

    var struct_class={
        container:plugin_name+'_container',

        img_add_btn:plugin_name+'_img_add_btn',

        img_editor:plugin_name+'_img_editor',
        draggable_item:plugin_name+'_draggable_item',
        dragged_item:plugin_name+'_dragged_item',


        img_del_btn:plugin_name+'_img_del_btn',

        preview_image:plugin_name+'_preview_image'

    };
    var status_class={
        dragstart:plugin_name+'_dragstart'
    };
    var default_class={
        draggable_item:plugin_name+'_draggable_item'
    };
    var active_class='draggable-active';
    var collision_grid_class='draggable-debug-collision-grid';

    var current_drag_obj;/*当前操作的容器*/

    /*样式*/
    $('head').append('<style>' +
    '.'+struct_class.draggable_item+'{' +
        'position:relative;top:0;left:0' +
    '}'+
    '.'+struct_class.container+'{' +
        '-webkit-user-select: none;' +
        ' -moz-user-select: none;' +
        ' -ms-user-select: none;' +
        ' -o-user-select: none;' +
    '}' +
    '</style>');

    /*生成一个数字区间中所有的数字*/
    function _range(min,max){
        var re=[];
        for(var i=max;i>=min;i--){
            re.push(i);
        }
        return re;
    }
    /*快速调用函数*/
    function _qcall(f,t){
        var args = Array.prototype.slice.call(arguments,2);
        if (typeof(f)=='function') f.apply(t,args);
    }
    /*点和矩形的碰撞检测*/
    function check_collision(point,list){
        var met=false;
        $.each(list,function(i,v){
            var is_x=false;
            var is_y=false;
            if(typeof(point.x)=='undefined'){
                is_x=true;/*未定义x坐标时x的判断固定为true*/
            }else{
                is_x=point.x>=v.min_x && point.x<=v.max_x;
            }
            if(typeof(point.y)=='undefined'){
                is_y=true;/*未定义y坐标时y的判断固定为true*/
            }else{
                is_y=point.y>=v.min_y && point.y<=v.max_y;
            }
            if(is_x && is_y){
                met= v;
                return false;
            }
        });
        //console.log('碰撞检测 :'+count+'次');
        return met;
    }
    /*点所在网格的矩形筛选*/
    function check_grid(point){
        var met_list=[];
        var met_x=[],met_y=[];
        var check_x=typeof(point.x)!='undefined';
        var check_y=typeof(point.y)!='undefined';
        if(check_x){
            met_x=current_drag_obj.droppable_area_list['x'+Math.floor(point.x/current_drag_obj.options.collision_grid_width)] || [];
            if(met_x.length==0) return false;/*无匹配*/
            if(!check_y) return met_x;/*如果不判断y,则直接返回x*/
        }
        if(check_y){
            met_y=current_drag_obj.droppable_area_list['y'+Math.floor(point.y/current_drag_obj.options.collision_grid_width)] || [];
            if(met_y.length==0) return false;/*无匹配*/
            if(!check_x) return met_y;/*如果不判断x,则直接返回y*/
        }
        var count=0;
        if(met_x.length>0 && met_y.length>0){ /*xy都有匹配的*/
            $.each(met_x,function(ky,vy){
                $.each(met_y,function(kx,vx){
                    count++;
                    if(vx.dom_index==vy.dom_index){ /*判断和y轴匹配的结果是否一致*/
                        met_list.push(vy);
                    }
                });
            });
        }else{
            console.log('todo: what\'s this info?',met_x,met_y);
        }
        //console.log('网格中的可碰撞区域检测 :'+count+'次 ');

        return met_list.length>0?met_list:false;
    }
    function check_met(){
        var that=this;
        var options=this.options;
        /*碰撞检测*/
        var center_coord={};/*拖动元素的中心坐标*/
        var new_pos=that.dragged_item.offset();
        center_coord.x=new_pos.left+that.dragged_item_width/2;
        center_coord.y=new_pos.top+that.dragged_item_height/2;
        var met;
        if(options.collision_grid){ /*使用网格优化的碰撞检测方案*/
            met=check_grid(center_coord);
        }else{/*全部遍历的碰撞检测方案*/
            met=that.droppable_area_list;
        }
        if(met) met=check_collision(center_coord,met);
        return met;
    }

    function update_collision_area(){
        var plugin=this;
        var options=this.options;
        var map={};
        if(options.draggableItemClass){
            plugin.draggable_item_list=$('.'+options.draggableItemClass,plugin.element);
        }else{
            plugin.draggable_item_list=plugin.element.children();
        }
        plugin.draggable_item_list.addClass(struct_class.draggable_item);/*需要被拖动的物件,加上class标记*/
        plugin.draggable_item_list.each(function(i){
            var that=$(this);
            if (that.hasClass(struct_class.dragged_item)){
                /*跳过被拖动的元素*/
            }else{
                var info={};
                var offset=that.offset();
                info.min_x=offset.left;
                info.max_x=offset.left+that.outerWidth();
                info.min_y=offset.top;
                info.max_y=offset.top+that.outerHeight();
                info.dom_index=i;

                if(options.collision_grid){ /*优化碰撞检测的网格,生成索引*/
                    var grid_width=options.collision_grid_width;
                    var x_range=_range(Math.floor(info.min_x/grid_width),Math.floor(info.max_x/grid_width));
                    var y_range=_range(Math.floor(info.min_y/grid_width),Math.floor(info.max_y/grid_width));
                    $.each([[x_range,'x'],[y_range,'y']],function(k,v){
                        $.each(v[0],function(kk,vv){
                            var key=v[1]+vv;
                            if(!map[key]) map[key]=[];
                            map[key].push(info);
                        });
                    });
                }else{
                    if(typeof(map.push)!='function') map=[];
                    map.push(info);
                }
            }
        });
        //if(current_drag_obj.options.collision_grid) {
        //    var mapl= 0,mapd=0;
        //    $.each(map,function(k,v){
        //        mapl++;
        //        mapd+= v.length;
        //    });
        //    console.log('本次更新一共有:'+mapl+'个网格,网格边长:'+current_drag_obj.options.collision_grid_width+'px,'+mapd+'个可碰撞区域');
        //}
        plugin.droppable_area_list=map;
    }

    /*拖动开始*/
    function drag_start(){
        var that=this;
        var options=this.options;
        if(that.dragstart) return;
        that.dragstart=1;

        if(options.placeholderClass){/*拖走之后的显示在原位置的元素*/
            that.placeholder = $('<div></div>');
            that.placeholder.addClass(options.placeholderClass);
            that.placeholder.css({
                top: that.dragged_item.offset().top - that.element.offset().top,
                left: that.dragged_item.offset().left - that.element.offset().left,
                width: that.dragged_item.outerWidth() - 10,
                height: that.dragged_item.outerHeight() - 10,
                lineHeight: that.dragged_item.height() - 18 + 'px',
                textAlign: 'center'
            });
            that.element.append(that.placeholder);
        }

        _qcall(options.onDragStart,that,that.dragged_item);
    }
    /*更新拖动元素的位置*/
    function update_dragged_item_position(e){
        var that=this;
        var options=this.options;
        var new_css={};
        if(options.axis!='y'){ /*未设置仅限竖直方向,则可在水平方向上拖动*/
            new_css.left=e.pageX-that.drag_start_coord.x;
        }
        if(options.axis!='x'){ /*未设置仅限水平方向,则可在竖直方向上拖动*/
            new_css.top=e.pageY-that.drag_start_coord.y;
        }
        /*新的位置*/
        that.dragged_item.css(new_css);
    }
    /*拖动元素与接触元素交换位置*/
    function exchange(e){
        var that=this;
        var options=this.options;
        var cover_item=this.draggable_item_list.eq(this.drag_cover_index);
        if(cover_item.length==0) return;

        var old_offset=that.dragged_item.offset();/*换位之前的位移*/
        /*如果目标区域之前有被拖住的元素，则新位置放在目标区域之后，否则就放在之前*/
        var search_prev=cover_item.prevAll('.'+struct_class.dragged_item);
        if (search_prev.length>0){
            cover_item.after(that.dragged_item);
        } else {
            cover_item.before(that.dragged_item);
        }
        var new_offset=that.dragged_item.offset();/*换位之后的位移*/
        /*更新鼠标初次点击坐标*/
        that.drag_start_coord.x+=new_offset.left-old_offset.left;
        that.drag_start_coord.y+=new_offset.top-old_offset.top;

        update_dragged_item_position.call(that,e);

        _qcall(options.onExchange,that,that.dragged_item,cover_item);

        update_collision_area.call(that);/*如果有碰撞,则更新碰撞检测区域*/
    }
    /*拖动结束*/
    function drag_end() {
        var that=this;
        var options=this.options;
        that.dragged_item.removeClass(struct_class.dragged_item);/*去掉被拖住的标记*/

        _qcall(options.onDragEnd,that,that.dragged_item);

        that.dragged_item=false;
        current_drag_obj=false;

        if(current_drag_obj.placeholder){
            current_drag_obj.placeholder.remove();
            current_drag_obj.placeholder = false;
        }
    }


    /**
     * 插件主类,容器管理器
     * @param element 容器元素
     * @param opt 自定义配置
     */
    function Container(element, opt){
        var options = $.extend(true,{}, Container.DEFAULTS);
        if(opt) $.extend(options, opt);
        this.options=options;
        this.element=element;

        var that=this;
        var items_except=[];
        if(options.placeholderClass){
            items_except.push('.'+options.placeholderClass);
        }
        if(options.show_collision_grid){ /*TODO::研究用*/
            items_except.push('.'+collision_grid_class);
            that.collision_grid=$('<div class="'+collision_grid_class+'" style="width:100%;height:100%;position:absolute;left:0;top:0;pointer-events:none;"></div>');
            element.append(that.collision_grid);
        }
        if(items_except){
            options.items=options.items+':not('+items_except.join(',')+')';
        }

        if(element.css('position')=='static') element.css('position','relative');
        element.addClass(struct_class.container);/*主容器的class*/
        /*初始化时的启用,禁用*/
        if (options.active == true) element.addClass(active_class);

        update_collision_area.call(that);/*重新计算可拖放区域坐标*/

        /*获取可拖动元素*/
        function get_dragged_item(target){
            var dragged_area={length:0},
                dragged_item={length:0};
            if(target.hasClass(struct_class.container)) return dragged_item;
            if(options.draggableAreaClass){
                if(target.hasClass(options.draggableAreaClass)){
                    dragged_area=target;
                }else{
                    dragged_area=target.closest('.'+options.draggableAreaClass);
                }
                if(dragged_area.length>0){
                    if(options.draggableItemClass){
                        dragged_item=target.closest('.'+options.draggableItemClass);
                    }else{
                        dragged_item=target.parentsUntil('.'+struct_class.container).last();
                    }
                }

            }else{
                dragged_area=target;
                if(options.draggableItemClass){
                    if(target.hasClass(options.draggableItemClass)){
                        dragged_item=target;/*选中draggableItem*/
                    }else{

                    }
                }else{ /*使用container下一级子元素作为draggableItem*/
                    if(target.parent().hasClass(struct_class.container)){
                        dragged_item=target;
                    }else{
                        dragged_item=target.parentsUntil('.'+struct_class.container).last();
                    }
                }
            }
            return dragged_item;
        }
        element
        .off('mousedown.'+plugin_name+' touchstart.'+plugin_name)
        .on('mousedown.'+plugin_name+' touchstart.'+plugin_name,function(e){

            if (that.dragged_item /*已存在拖起的元素*/ ||
                e.which!=1 /*点击的不是鼠标左键*/ ||
                !options.active) return ;

            var target=$(e.target);
            var dragged_item=get_dragged_item.call(that,target);
            if(dragged_item.length==0) return;/*没有获取到拖动元素*/

            _qcall(options.onDrag,that,dragged_item);

            element.addClass(status_class.dragstart);/*容器进入拖动状态的class*/
            dragged_item.addClass(struct_class.dragged_item);/*添加被拖住的标记*/

            update_collision_area.call(that);/*重新计算可拖放区域坐标*/

            /*拖动开始的鼠标点击位置*/
            that.drag_start_coord.x = e.pageX;
            that.drag_start_coord.y = e.pageY;

            /*元素开始拖动的中心坐标*/
            that.dragged_item_width=dragged_item.outerWidth();
            that.dragged_item_height=dragged_item.outerHeight();

            that.draggable=1;/*允许拖动*/
            that.dragstart=0;/*开始拖动的状态标记*/

            that.dragged_item=dragged_item;
            current_drag_obj=that;
        });
    }

    Container.prototype = {
        draggable:0,
        dragstart:0,

        drag_start_coord:{},
        dragged_item_width:0,
        dragged_item_height:0,

        draggable_item_list:{},
        droppable_area_list:[] /*TODO::碰撞检测*/
    };

    Container.DEFAULTS = {
        draggableItemClass:false,
        draggableAreaClass:false,/*自定义可拖动区域，需要在items内部*/

        placeholderClass:'',
        active: true,
        axis: false,
        resetTime:300,
        drop_exchange:1,


        collision_grid:false,
        collision_grid_width:100,
        show_collision_grid:0,
        onDrag:function(dragged_item){
            /*抓起还未移动时的事件*/
        },
        onDragStart:function(dragged_item){
            /*抓起并刚开始移动时的事件*/
        },
        onContact:function(dragged_item){

        },
        onExchange:function(dragged_item,change_item){
            /*元素位置发生变化时的事件*/
        },
        onDrop:function(result_item){
            /*放下并且元素时的事件*/
        },
        onDragEnd:function(){

        }
    };


    var API = {
        enable: function() {
            this.options.active = true;
            if (!this.element.hasClass(active_class)) {
                this.element.addClass(active_class)
            }
        },
        disable: function (){
            this.options.active = false;
            this.element.removeClass(active_class);
        }
    };
    /*全局事件*/
    $(window)
    .on('mousemove.'+plugin_name,function(e) {
        /*鼠标移动时拖动物件 TODO::优化,降低cpu使用量*/
        if(current_drag_obj && current_drag_obj.draggable && current_drag_obj.dragged_item){
            var options=current_drag_obj.options;

            //current_drag_obj.x = e.pageX;
            //current_drag_obj.y = e.pageY;
            drag_start.call(current_drag_obj);

            update_dragged_item_position.call(current_drag_obj,e);

            /*判断是否接触*/
            var met=check_met.call(current_drag_obj);
            if(met){
                if(current_drag_obj.drag_cover_index!=met.dom_index){
                    /*首次接触*/
                    current_drag_obj.drag_cover_index=met.dom_index;
                    var cover_item=current_drag_obj.draggable_item_list.eq(current_drag_obj.drag_cover_index);
                    _qcall(options.onContact,
                        current_drag_obj,
                        current_drag_obj.dragged_item,
                        cover_item
                    );
                    if(options.drop_exchange){
                        current_drag_obj.draggable_item_list.filter('.covered').removeClass('covered');
                        cover_item.addClass('covered');
                    }else{
                        exchange.call(current_drag_obj,e);
                    }
                }
            }else{
                if(current_drag_obj.drag_cover_index>0){
                    /*首次分离*/
                    current_drag_obj.draggable_item_list.removeClass('covered');
                }
                current_drag_obj.drag_cover_index='t';/*随便设置一个string*/
            }
        }
    })
    .on('mouseup.'+plugin_name,function(e){

        /*鼠标松开时复位物件*/
        if(current_drag_obj && current_drag_obj.draggable && current_drag_obj.dragged_item){
            current_drag_obj.draggable=0;/*禁止拖动*/

            var options=current_drag_obj.options;

            _qcall(options.onDrop,current_drag_obj,current_drag_obj.dragged_item);

            if(options.drop_exchange && current_drag_obj.drag_cover_index>0){
                exchange.call(current_drag_obj,e);
            }

            //if ($.contains(current_drag_obj.element[0], current_drag_obj.dragged_item[0])) {
                current_drag_obj.dragged_item.animate(
                    {
                        left: 0,
                        top: 0
                    },
                    current_drag_obj.options.resetTime,
                    function(){
                        drag_end.call(current_drag_obj);
                    }
                );
            //} else {
                /*TODO::拖到容器外面了*/
                //current_drag_obj.dragged_item.fadeOut(current_drag_obj.options.resetTime,drag_end);
            //}


        }

        if(current_drag_obj) current_drag_obj.element.removeClass(status_class.dragstart);/*去掉容器拖动状态的clss*/
    });
     /**
     * 入口方法
     * @param methodOrOptions 参数说明:
     * @returns {*}
     */
    $.fn[plugin_name] = function(methodOrOptions) {
        var args = Array.prototype.slice.call(arguments, 1);
        var re=[];
        var el=this.each(function(){
            var $t = $(this),
                plugin_instance = $t.data(plugin_name);
            if(plugin_instance && API[methodOrOptions]){
                re.push(API[methodOrOptions].apply(plugin_instance, args));
            }else if(!plugin_instance){
                $t.data(plugin_name, new Container($t, methodOrOptions));
            }
        });

        return re.length>0?(re.length==1?re[0]:re):el;
    };
})(jQuery);