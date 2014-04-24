Zotero.HelloWorldZotero = {
	DB: null,
	
	init: function () {
		// Connect to (and create, if necessary) helloworld.sqlite in the Zotero directory
		this.DB = new Zotero.DBConnection('helloworld');
		
		if (!this.DB.tableExists('changes')) {
			this.DB.query("CREATE TABLE changes (num INT)");
			this.DB.query("INSERT INTO changes VALUES (0)");
		}
		
		// Register the callback in Zotero as an item observer
		var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']);
		
		// Unregister callback when the window closes (important to avoid a memory leak)
		window.addEventListener('unload', function(e) {
				Zotero.Notifier.unregisterObserver(notifierID);
		}, false);
	},
	
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
      //nodes.push(node);
      nodes[node.name] = node;
      for (var j=0; j<related_items.length; j++) {
        related_item = Zotero.Items.get(related_items[j]);
        //alert(related_item.getField('title'))
        link = { source: node.name, target: related_item.getField('title') };
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

    var path = svg.append("g").selectAll("path")
      .data(force.links())
      .enter().append("path")
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

    var text = svg.append("g").selectAll("text")
      .data(force.nodes())
      .enter().append("text")
      .attr("x", 8)
      .attr("y", ".31em")
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px")
      .text(function(d) { return d.name; });

    function tick() {
      path.attr("d", linkArc);
      circle.attr("transform", transform);
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

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.HelloWorldZotero.init(); }, false);
