/**
 * 日期格式化字符串
 * @param date 日期对象
 * @param {string} pattern 日期格式，如yyyy-MM-dd HH:mm:ss
 * @return {string} 经过格式化后的日期字符串
 */
Date.prototype.format = function(pattern) {
	var opts = {
        'M+': this.getMonth() + 1,
        'd+': this.getDate(),
        'h+': this.getHours(),
        'm+': this.getMinutes(),
        's+': this.getSeconds(),
        'q+': Math.floor((this.getMonth() + 3) / 3),
        S: this.getMilliseconds()
    };
	
	if (/(y+)/.test(pattern)) {
		pattern = pattern.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
	}
	
    for (var i in opts) {
    	if ( new RegExp('(' + i + ')').test(pattern) ) {
    		pattern = pattern.replace(RegExp.$1, 1 == RegExp.$1.length ? opts[i] : ('00' + opts[i]).substr(('' + opts[i]).length))
    	}
    }
    
    return pattern;
};

$(function(){
    renderBookmarks();

    $('#showRepeat').on('click', function(){
        renderBookmarks({repeat: true});
    });

    $(document).on('click', '.editlink', function(e){
        e.preventDefault();

        alert(this.id);
    });

    $(document).on('click', '.deletelink', function(e){
        e.preventDefault();

        var id = this.id, flag = confirm('是否删除【'+id+'】?');
        if (flag) {
            removeBookmark([[id, $(this).parents('tr[role=row]')]]);
        }
    });

    $(document).on('click', '.multidelete', function(e){
        e.preventDefault();
        
        var bookmarks = [];
        $('[name=linkid]').each(function(){
            if (this.checked) {
                bookmarks.push([this.value, $(this).parents('tr[role=row]')]);
            }
        });
        removeBookmark(bookmarks);
    });

    $(document).on('click', 'tr[role=row]', function(e){
        if ($(e.target).is(':checkbox')) {
            $(e.target).parents('tr[role=row]').toggleClass('highlight');
            return;
        }
        var self = $(this), cb = self.find(':checkbox').click();
        if (cb.is(':checked')) {
            self.addClass('highlight');
        } else {
            self.removeClass('highlight');
        }
    });
});

function renderBookmarks(opts) {
    $('#bookmarks').empty();
    dumpBookmarks(opts);
}

function removeBookmark(bookmarks) {
    for(var i=0; i<bookmarks.length; i++){
        var bookmark = bookmarks[i];
        (function(id, tr){
            chrome.bookmarks.remove(id, function(){
                tr.remove();
            });
        })(bookmark[0], bookmark[1]);
    }
}

function dumpBookmarks(opts) {
    opts = opts || {};
    var bookmarkTreeNodes = chrome.bookmarks.getTree(
        function(bookmarkTreeNodes) {
            var list = [];
            
            var start = new Date();
            console.log('开始过滤：'+start.format('yyyy-MM-dd hh:mm:ss'));
            getAllTreeNodes(list, bookmarkTreeNodes);
            if (opts.repeat) {
                list = filterRepeatList(list);
            }
            var end = new Date();
            console.log('结束过滤：'+end.format('yyyy-MM-dd hh:mm:ss'));
            console.log('过滤数据耗时：'+((end.getTime() - start.getTime())/1000)+'s', '数据量：'+list.length);
            
            console.log('开始初始化：'+end.format('yyyy-MM-dd hh:mm:ss'));
            $('#bookmarks').DataTable( {
                destroy: true,
                paging: true,
                pageLength: 20,
                searching: true,
                order: [[3,'asc']],
                deferRender: true,
                data: list,
                columns: [
                    {data: 'id', width: 50},
                    {title: '操作', data: 'id', width: 120},
                    {title: '编号', data: 'id', width: 60},
                    {title: '日期', data: 'dateAdded', width: 120},
                    {title: '标题', data: 'title'},
                    {title: '地址', data: 'url', className: 'keep-word'}
                ],
                columnDefs: [
                    {
                        targets: 0,
                        data: null,
                        title: '<a id="multidelete" href="#">删除</a>',
                        orderable: false,
                        searchable: false,
                        render: function(data){
                            return '<input type="checkbox" name="linkid" value="'+data+'"/>';
                        }
                    },
                    {
                        targets: 1,
                        data: null,
                        render: function(data, type, row){
                            var viewlink = $('<a href="'+row.url+'" target="_blank">').text('查看');
                            var editlink = $('<a id="'+data+'" class="editlink" href="#" style="margin:0 10px">').text('编辑');
                            var deletelink = $('<a id="'+data+'" class="deletelink" href="#">').text('删除');
                            return $('<span>').append(viewlink).append(editlink).append(deletelink).html();
                        }
                    },
                    {
                        targets: 3,
                        data: null,
                        render: function(data){
                            return (new Date(data)).format('yyyy年MM月dd日');
                        }
                    },
                    {
                        targets: [4,5],
                        data: null,
                        render: function(data, type, row){
                            return '<a href="'+row.url+'" target="_blank">'+data+'</a>';
                        }
                    }
                ]
            });
            var e = new Date();
            console.log('结束初始化：'+e.format('yyyy-MM-dd hh:mm:ss'));
            console.log('初始化耗时：'+((e.getTime() - end.getTime())/1000))+'s';
        }
    );
}

function getAllTreeNodes(list, bookmarkTreeNodes) {
    var i = 0, len = bookmarkTreeNodes.length;
    for (;i<len;i++) {
        var bookmark = getTreeNodes(list, bookmarkTreeNodes[i]);
        if (bookmark) {
            list.push(bookmark);
        }
    }
}

function getTreeNodes(list, bookmarkNode) {
    if (!bookmarkNode) {
        return;
    }

    var hasTitle = !!bookmarkNode.title
        , hasChildren = bookmarkNode.children && bookmarkNode.children.length > 0;

    bookmarkNode.url = bookmarkNode.url||'';
    if (!hasChildren) {
        list.push(bookmarkNode);
    } else {
        var bookmark = getAllTreeNodes(list, bookmarkNode.children);
        if (bookmark) {
            list.push(bookmark);
        }
    }
}

function dumpAllTreeNodes(treeNodes) {
    treeNodes.sort(function(b1, b2){
        return b1.title > b2.title ? -1 : 1;
    });

    var arr = [], i = 0, len = treeNodes.length, n = 0;
    for (;i<len;i++) {
        var bookmarkNode = treeNodes[i];
        if (!bookmarkNode) {
            continue;
        }
        var tr = $('<tr>');
        // 序号
        tr.append($('<td>').text(++n));
        // 标题
        tr.append($('<td width="500"><a href="'+bookmarkNode.url+'" target="_blank">'+bookmarkNode.title+'</a></td>'));
        // 日期
        var dateStr = (new Date(bookmarkNode.dateAdded)).format('yyyy年MM月dd日 hh:mm:ss')
        tr.append($('<td>'+dateStr+'</td>'));
        // 操作
        tr.append($('<td>[<a id="editlink" href="#">编辑</a><a id="deletelink" href="#">删除</a>]</td>'));

        $('#editlink').click(function(e){
            e.preventDefault();
        });

        $('#deletelink').click(function(e){
            e.preventDefault();
        });

        arr.push(tr);
    }
    return arr;
}

function filterRepeatList(list) {
    var obj = {}, item;
    for(var i=0; i<list.length; i++){
        item = list[i];
        if (!item.url) {
            continue;
        }
        if (!obj[item.url]) {
            obj[item.url] = [item];
        } else {
            obj[item.url].push(item);
        }
    }
    
    var arr = [];
    for (var url in obj) {
        if (obj.hasOwnProperty(url)) {
            var bookmarks = obj[url];
            if (bookmarks.length > 1) {
                arr = arr.concat(bookmarks);
            }
        }
    }

    return arr;
}