Zotero.HelloWorldZotero = {
	drawGraph: function() {
    var Zotero = Components.classes["@zotero.org/Zotero;1"]
      .getService(Components.interfaces.nsISupports).wrappedJSObject;
    var ZoteroPane = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator)
      .getMostRecentWindow("navigator:browser").ZoteroPane;
    var selected_items = ZoteroPane.getSelectedItems();
    
    var newWindow = window.open('');
    var d = newWindow.document,
        e = d.documentElement,
        g = d.body;

    var newWindowRoot = d3.select(newWindow.document.body);
    //newWindowRoot.append("p").text("New paragraph!");
    
    var width  = newWindow.innerWidth || e.clientWidth || g.clientWidth,
        height = newWindow.innerHeight|| e.clientHeight|| g.clientHeight,
        nodes = {},
        node,
        related_node,
        date,
        links = [],
        link;

    var svg = newWindowRoot.append("svg")
      .attr("width", width)
      .attr("height", height);

    var min_year = Infinity,
        max_year = 0,
        year;

    for (var i=0; i<selected_items.length; i++) {
      item = selected_items[i];
      related_items = item.relatedItemsBidirectional;
      date = Zotero.Date.strToDate(item.getField("date"));
      node = { name: item.getField('title'), year: date.year, authors: item.getCreators() };
      nodes[node.name] = node;
      year = parseFloat(node.year);
      if (year < min_year) {
        min_year = year;
      }
      if (year > max_year) {
        max_year = year;
      }
      for (var j=0; j<related_items.length; j++) {
        related_item = Zotero.Items.get(related_items[j]);
        date = Zotero.Date.strToDate(related_item.getField("date"));
        var related_node = { name: related_item.getField('title'), year: date.year, authors: related_item.getCreators() };
        year = parseFloat(related_node.year);
        if (year < min_year) {
          min_year = year;
        }
        if (year > max_year) {
          max_year = year;
        }
        link = { source: node, target: related_node };
        links.push(link);
      }
    }

    // Compute the distinct nodes from the links.
    links.forEach(function(link) {
      link.source = nodes[link.source.name] || (nodes[link.source.name] = link.source);
      link.target = nodes[link.target.name] || (nodes[link.target.name] = link.target);
    });

    var nodes_array = d3.values(nodes);

    var force = d3.layout.force()
      .nodes(nodes_array)
      .links(links)
      .size([width, height])
      .charge(-300)
      .gravity(0)
      .linkDistance(20)
      .linkStrength(0.1)
      .on("tick",tick)
      .start();

    var line = svg.append("g").selectAll("line")
      .data(force.links())
      .enter().append("line")
      .attr("fill", "none")
      .attr("stroke", "#666")
      .attr("stroke-width", "1.5px");

    var circle = svg.append("g").selectAll("circle")
      .data(force.nodes())
      .enter().append("circle")
      .attr("r", 6)
      .attr("stroke", "#333")
      .attr("fill", "#ccc");

    circle.append("svg:title")
      .text(function(d) { return d.name; })

    circle.call(force.drag);

    var text = svg.append("g").selectAll("text")
      .data(force.nodes())
      .enter().append("text")
      .attr("x", 8)
      .attr("y", -8)
      //.attr("y", ".31em")
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px")
      .text(function(d) { return d.authors[0].ref.lastName + d.year; });

    function tick(e) {
      width = newWindow.innerWidth || e.clientWidth || g.clientWidth;
      height = newWindow.innerHeight|| e.clientHeight|| g.clientHeight;
      var y0 = height/2,
          x0 = width/2,
          x_min = 0 + width/3,
          x_max = width - width/3,
          k = 0.1 * e.alpha;
      nodes_array.forEach(function(o,i) {
        var age = (parseFloat(o.year)-min_year)/(max_year-min_year);
        var x_nom = age*x_max + (1-age)*x_min;
        var y_nom = y0;
        o.y += (y_nom - o.y)*k;
        o.x += (x_nom - o.x)*k;
      });
      line.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
      circle.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
      text.attr("transform", transform);
    }

    function linkArc(d) {
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    }

    function transform(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }

    function updateWindow(){
      width = newWindow.innerWidth || e.clientWidth || g.clientWidth;
      height = newWindow.innerHeight|| e.clientHeight|| g.clientHeight;

      svg.attr("width", width).attr("height", height);
      force.size([width,height])
        .start();
    }
    newWindow.onresize = updateWindow;
  },

  // Callback implementing the notify() method to pass to the Notifier
  notifierCallback: {
    notify: function(event, type, ids, extraData) {
      if (event == 'add' || event == 'modify' || event == 'delete') {
        // Increment a counter every time an item is changed
        Zotero.HelloWorldZotero.DB.query("UPDATE changes SET num = num + 1");

        if (event != 'delete') {
          // Retrieve the added/modified items as Item objects
          var items = Zotero.Items.get(ids);
        }
        else {
					var items = extraData;
				}
				
				// Loop through array of items and grab titles
				var titles = [];
				for each(var item in items) {
					// For deleted items, get title from passed data
					if (event == 'delete') {
						titles.push(item.old.title ? item.old.title : '[No title]');
					}
					else {
						titles.push(item.getField('title'));
					}
				}
				
				if (!titles.length) {
					return;
				}
				
				// Get the localized string for the notification message and
				// append the titles of the changed items
				var stringName = 'notification.item' + (titles.length==1 ? '' : 's');
				switch (event) {
					case 'add':
						stringName += "Added";
						break;
						
					case 'modify':
						stringName += "Modified";
						break;
						
					case 'delete':
						stringName += "Deleted";
						break;
				}
				
				var str = document.getElementById('hello-world-zotero-strings').
					getFormattedString(stringName, [titles.length]) + ":\n\n" +
					titles.join("\n");
			}
			
			var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			ps.alert(null, "", str);
		}
	}
};
