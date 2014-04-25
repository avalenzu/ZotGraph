Zotero.HelloWorldZotero = {
	drawGraph: function() {
    var Zotero = Components.classes["@zotero.org/Zotero;1"]
      .getService(Components.interfaces.nsISupports).wrappedJSObject;
    var ZoteroPane = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator)
      .getMostRecentWindow("navigator:browser").ZoteroPane;
    var selected_items = ZoteroPane.getSelectedItems();
    
    var newWindow = window.open('');

    var newWindowRoot = d3.select(newWindow.document.body);
    //newWindowRoot.append("p").text("New paragraph!");
    
    var w = 960,
        h = 500,
        nodes = {},
        node,
        links = [],
        link;

    var svg = newWindowRoot.append("svg")
      .attr("width", w)
      .attr("height", h);

    for (var i=0; i<selected_items.length; i++) {
      item = selected_items[i];
      related_items = item.relatedItemsBidirectional;
      node = { name: item.getField('title') };
      //node = {name:  moment(item.getField("date")).format("YYYY") };
      //nodes.push(node);
      nodes[node.name] = node;
      for (var j=0; j<related_items.length; j++) {
        related_item = Zotero.Items.get(related_items[j]);
        //alert(related_item.getField('title'))
        link = { source: node.name, target: related_item.getField('title') };
        //if (parseint(item.getField("year")) < parseint(related_item.getField("year)"))) {
          //link = { source: node.name, target: related_item.getField('title') };
        //} else {
          //link = { source:related_item.getField('title'), target:  node.name };
        //}
        links.push(link);
      }
    }

    // Compute the distinct nodes from the links.
    links.forEach(function(link) {
      link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
      link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
    });

    var force = d3.layout.force()
      .nodes(d3.values(nodes))
      .links(links)
      .size([w, h])
      .charge(-300)
      .linkDistance(60)
      .on("tick",tick)
      .start();

//var link = svg.selectAll(".link")
      //.data(graph.links)
    //.enter().append("line")
      //.attr("class", "link")
      //.style("stroke-width", function(d) { return Math.sqrt(d.value); });

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
      .attr("fill", "#ccc")
      .call(force.drag);

    circle.append("svg:title")
      .text(function(d) { return d.name; })

    var text = svg.append("g").selectAll("text")
      .data(force.nodes())
      .enter().append("text")
      .attr("x", 8)
      .attr("y", ".31em")
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px")
      .text(function(d) { return d.name.substring(0,10); });

    function tick() {
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
    //svg.selectAll("path")
      //.data(nodes)
      //.enter().append("path")
      //.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      //.attr("d", d3.svg.symbol()
          //.size(function(d) { return d.size; })
          //.type(function(d) { return d.type; }))
      //.style("fill", "steelblue")
      //.style("stroke", "white")
      //.style("stroke-width", "1.5px")
      //.call(force.drag);

    //svg.append("title")
      //.text(function(d) { return d.name });
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
