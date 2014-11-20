/* Copyright (c) 2014 TrueStream LLC. All Rights Reserved. */

// Declare app level module which depends on views, and components
(function() {
    var app = angular.module('Designer', []);

    //+ Top <div> element.
    app.controller('AdministrationController', function(){
        this.name = 'adminstrator';
    });
    //- Top <div> element.

    //+ Workspace <div> element. Contains current design.
    app.controller('WorkspaceController', function(){
        var self = this;
        self.SDK_zmq_host = 'localhost:2000';
        self.name = 'workspace';
        self.components = {};
        self.shown = false;
        self.CONFIGURATION_URL = '/app/config/tools.js';

        self.initialize_connection_with_sdk = function(){
            self.SDK_socket = io(self.SDK_zmq_host);
            self.SDK_socket.on('ui_fromController', self.receive_message_from_sdk);
        };
      
        /* objectify
            Constructs an object from an array.
      */self.objectify = function(obj, val, index) {
            obj[index] = val;
            return obj;
        };
        
        /* send_message_to_sdk
        Sends information about the current Workflow to the SDK.
      */self.send_message_to_sdk = function(message_to_sdk){
            self.SDK_socket.emit('ui_toSDK', JSON.stringify(message_to_sdk));
        };

        /* receive_message_from_sdk
        Recieves information from the SDK about the current state of the Macrotool.
      */self.receive_message_from_sdk = function(message_from_sdk){
            console.log(message_from_sdk);
        };

        /* send_message_to_nam
        Sends information about the current Workflow to NAM
      */self.send_message_to_nam = function(message_to_nam){
            self.SDK_socket.emit('ui_toNAM', message_to_nam);
        };

        /* receive_message_from_nam
        Recieves information from NAM about its current state.
      */self.receive_message_from_nam = function(message_from_nam){
            // console.log(message_from_nam);
        };

        /* construct_message_to_nam
        Construct messages based on the current NAM flow.
      */self.construct_message_to_nam = function(source_tool, target_tool) {
            if (source_tool === undefined || target_tool === undefined) { return; }
            var NAM = self.NAM;
            var ioGateway = self.model.getCell(NAM.attributes.embeds[0]),
                semaphore = self.model.getCell(NAM.attributes.embeds[1]),
                sqliAnalytic = self.model.getCell(NAM.attributes.embeds[2]),
                portscanAnalytic = self.model.getCell(NAM.attributes.embeds[3]),
                ddosAnalytic = self.model.getCell(NAM.attributes.embeds[4]);

            if (NAM === undefined || ioGateway === undefined || semaphore === undefined ||
                sqliAnalytic === undefined || portscanAnalytic === undefined || ddosAnalytic === undefined) {
                // Don't try to construct a NAM message if all the pieces aren't there.
                return;
            }

            var source_is_NAM_component =   (source_tool.attributes.type === NAM.attributes.type) ||
                                            (source_tool.attributes.type === ioGateway.attributes.type) ||
                                            (source_tool.attributes.type === semaphore.attributes.type) ||
                                            (source_tool.attributes.type === sqliAnalytic.attributes.type) ||
                                            (source_tool.attributes.type === portscanAnalytic.attributes.type) ||
                                            (source_tool.attributes.type === ddosAnalytic.attributes.type);
            
            var target_is_NAM_component =   (target_tool.attributes.type === NAM.attributes.type) ||
                                            (target_tool.attributes.type === ioGateway.attributes.type) ||
                                            (target_tool.attributes.type === semaphore.attributes.type) ||
                                            (target_tool.attributes.type === sqliAnalytic.attributes.type) ||
                                            (target_tool.attributes.type === portscanAnalytic.attributes.type) ||
                                            (target_tool.attributes.type === ddosAnalytic.attributes.type);
            
            if (source_is_NAM_component && target_is_NAM_component) {
                var nam_message = '-000';

                var connected_to_semaphore = null,
                    connected_to_NAM = [];

                io_links = self.model.getConnectedLinks(ioGateway);
                for (var i = 0; i < io_links.length; i++) {
                    if ((io_links[i].attributes.source.id === NAM.id) ||
                        (io_links[i].attributes.target.id === NAM.id)) {
                            connected_to_NAM.push(io_links[i]);
                    } else if (io_links[i].attributes.target.id === semaphore.id) {
                        connected_to_semaphore = io_links[i];
                    }
                }
                if ((connected_to_semaphore != null) &&
                    (connected_to_NAM.length == 2)) {
                    nam_message = '+';
                } else {
                    nam_message = '-';
                }

                semaphore_links = self.model.getConnectedLinks(semaphore);
                var sqli_assertion = '0',
                    portscan_assertion = '0',
                    ddos_assertion = '0';

                for (var i = 0; i < semaphore_links.length; i++) {
                    var sem_link = semaphore_links[i];
                    var source = self.model.getCell(sem_link.attributes.source.id),
                        target = self.model.getCell(sem_link.attributes.target.id);

                    if (target.attributes.type === sqliAnalytic.attributes.type) {
                        sqli_assertion = '1';
                    } else if (target.attributes.type === portscanAnalytic.attributes.type) {
                        portscan_assertion = '2';
                    } else if (target.attributes.type === ddosAnalytic.attributes.type) {
                        ddos_assertion = '3';
                    }
                }

                nam_message += sqli_assertion + portscan_assertion + ddos_assertion;
                return nam_message;
            }
        }

        /* show
        Instantiates and renders a sample workspace.
      */self.show = function() {
            // Only instantiate elements once.
            if (self.shown === true) {return;}
            self.shown = true;

            self.initialize_connection_with_sdk();
            self.initialize();    
            self.registerEvents();
        };

        self.toggleStencil = function() {
            if (self.stencil_hidden === undefined) {
                self.stencil_hidden = true;
            } else {
                self.stencil_hidden = !self.stencil_hidden;
            }

            if (self.stencil_hidden === true) {
                $('#stencil-container').animate({
                        height: "0%",
                        opacity: "0"
                    }, 500, function(){
                        // Animation complete.
                        $('#stencil-container').css('display', 'none');
                    });
            } else {
                $('#stencil-container').css('display', 'inherit');
                $('#stencil-container').animate({
                        height: "35%",
                        opacity: "1"
                    }, 500, function(){
                        // Animation complete.
                    });
            }
        };

        self.toggleInspector = function() {
            if (self.inspector_hidden === undefined) {
                self.inspector_hidden = true;
            } else {
                self.inspector_hidden = !self.inspector_hidden;
            }

            if (self.inspector_hidden === true) {
                $('#inspector-container').animate({
                        width: "0%",
                        opacity: "0"
                    }, 500, function(){
                        // Animation complete.
                    });
                $('#stencil-container').animate({
                        width: "100%"
                    }, 500, function(){
                        // Animation complete.
                    });
            } else {
                $('#inspector-container').animate({
                        width: "20%",
                        opacity: "1.0"
                    }, 500, function(){
                        // Animation complete.
                    });
                $('#stencil-container').animate({
                        width: "80%"
                    }, 500, function(){
                        // Animation complete.
                    });
            }
        };

        self.saveGraph = function() {
            self.toolbar.saveGraph();
        };

        self.loadGraph = function() {
            self.toolbar.loadGraph();
        };

        self.tbToJSON = function() {
            self.toolbar.toJSON();
        };

        self.psZoomIn = function() {
            self.paperScroller.zoom(0.2, { max: 4 });
        }

        self.psZoomOut = function() {
            self.paperScroller.zoom(-0.2, { min: 0.2 });
        }

        self.graphClear = function() {
            var links = self.model.getLinks();

            for (var i = 0; i < links.length; i++) {
                var link = links[i];

                link.remove();
            }

            var elements = self.model.getElements();

            for (var i = 0; i < elements.length; i++) {
                var element = elements[i];

                element.remove();
            }

            self.model.clear();
        };

        self.commandUndo = function() {
            self.commandManager.undo();
        }; 

        self.commandRedo = function() {
            self.commandManager.redo();
        };

        /* createConnection
        Notify the server about a link's connection; and perform it.
      */self.createConnection = function(link) {
            var sourcePort = link.get('source').port;
            var sourceId = link.get('source').id;
            var targetPort = link.get('target').port;
            var targetId = link.get('target').id;

            var source = link.get('source');
            var target = link.get('target');

            if ((target.id !== undefined) && (source.id !== target.id)) {// && (link._previousAttributes.target.id !== target.id)) {
                var source_tool = self.model.getCell(sourceId);
                var target_tool = self.model.getCell(targetId);

                if (source_tool === undefined || target_tool === undefined) {
                    return;
                }   
                /* Make glowing links if design is complete. */
                // We need to see if the first tool is a Generator and the last tool is a Display.

                self.connect(source, target, source_tool, target_tool);
                link.remove();

                if (self.NAM !== undefined) {
                    var nam_message = self.construct_message_to_nam(source_tool, target_tool);
                    if (nam_message !== undefined) {
                        self.send_message_to_nam(nam_message);
                    }
                }
                var now = Date.now().toLocaleString();
                var sdk_message = { 
                    "timestamp": ""+now,
                    "source":'10.10.10.175',
                    "destination":self.host,
                    "type":'From_UI_Message',
                    "payload": {
                        "sourceid": source_tool.attributes.id,
                        "targetid": target_tool.attributes.id,
                        "source_type": source_tool.attributes.type,
                        "target_type": target_tool.attributes.type,
                        "source": source_tool.attributes.sdk_props.command,
                        "source_input_rate": source_tool.attributes.sdk_props.input_rate.reduce(self.objectify, {}),
                        "source_input_augment": source_tool.attributes.sdk_props.input_augment.reduce(self.objectify, {}),
                        "source_input_transform": source_tool.attributes.sdk_props.input_transform.reduce(self.objectify, {}),
                        "target": target_tool.attributes.sdk_props.command,
                        "target_input_rate": target_tool.attributes.sdk_props.input_rate.reduce(self.objectify, {}),
                        "target_input_augment": target_tool.attributes.sdk_props.input_augment.reduce(self.objectify, {}),
                        "target_input_transform": target_tool.attributes.sdk_props.input_transform.reduce(self.objectify, {}),
                        "command": "connect"
                    }
                };
    
                self.send_message_to_sdk(sdk_message);
            }
        };

        /* deleteConnection
        Notify the server about a link's disconnection; and perform it.
      */self.deleteConnection = function(link) {
            if (link._previousAttributes.source === undefined) { return; }
            if (link._changing === false){
                var sourcePort = link._previousAttributes.source.port;
                var sourceId = link._previousAttributes.source.id;
                var targetPort = link._previousAttributes.target.port;
                var targetId = link._previousAttributes.target.id;

                var source = link._previousAttributes.source;
                var target = link._previousAttributes.target;

                if ((target.id !== undefined) && (source.id !== target.id)) {

                    var source_tool = self.model.getCell(sourceId);
                    var target_tool = self.model.getCell(targetId);

                    if (source_tool === undefined || target_tool === undefined) {
                        return;
                    }

                    if (self.NAM !== undefined) {
                        var nam_message = self.construct_message_to_nam(source_tool, target_tool);
                        if (nam_message !== undefined) {
                            self.send_message_to_nam(nam_message);
                        }
                    }
                    var now = Date.now().toLocaleString();
                    var sdk_message = { 
                            "timestamp": ""+now,
                            "source":'10.10.10.175',
                            "destination":self.host,
                            "type":'From_UI_Message',
                            "payload": {
                                "sourceid": source_tool.attributes.id,
                                "targetid": target_tool.attributes.id,
                                "source_type": source_tool.attributes.type,
                                "target_type": target_tool.attributes.type,
                                "source": source_tool.attributes.sdk_props.command,
                                "source_input_rate": source_tool.attributes.sdk_props.input_rate.reduce(self.objectify, {}),
                                "source_input_augment": source_tool.attributes.sdk_props.input_augment.reduce(self.objectify, {}),
                                "source_input_transform": source_tool.attributes.sdk_props.input_transform.reduce(self.objectify, {}),
                                "target": target_tool.attributes.sdk_props.command,
                                "target_input_rate": target_tool.attributes.sdk_props.input_rate.reduce(self.objectify, {}),
                                "target_input_augment": target_tool.attributes.sdk_props.input_augment.reduce(self.objectify, {}),
                                "target_input_transform": target_tool.attributes.sdk_props.input_transform.reduce(self.objectify, {}),
                                "command": "disconnect"
                            }
                    };
        
                    self.send_message_to_sdk(sdk_message);
                }
            }
        };

        /* connect
        Connects two tools together.
      */self.connect = function(source, target, source_tool, target_tool) {
            var link = new joint.shapes.toolset.Link({
                source: { id: source.id, selector: source.selector },
                target: { id: target.id, selector: target.selector },
                router: { name: 'metro' },
                // connector: { name: 'smooth' }
            });

            if ((source_tool !== undefined) && (target_tool !== undefined)) {
                link.attr({
                    '.connection': { stroke: source_tool.attributes.attrs['.body'].fill, 'stroke-width': 10 },
                    '.connection-wrap': { stroke: '#000000', 'stroke-width': 4 },
                    '.marker-source': { stroke: '#000000', 'stroke-width': 2, fill: target_tool.attributes.attrs['.body'].fill, d: 'M 20 0 L 0 10 L 20 20 z' },
                    '.marker-target': { stroke: '#000000', 'stroke-width': 2, fill: source_tool.attributes.attrs['.body'].fill, d: 'M 20 0 L 0 10 L 20 20 z' }
                });    
            }
            else {
                link.attr({
                '.connection': { stroke: '#E74C3C', 'stroke-width': 8 },
                '.connection-wrap': { stroke: '#1E242B', 'stroke-width': 10 },
                '.marker-source': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 20 0 L 0 10 L 20 20 z' },
                '.marker-target': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 20 0 L 0 10 L 20 20 z' }
            });
            }
            

            link.ts_properties = { count: 0 };

            link.transition('attrs/.connection/stroke', target_tool !== undefined ? target_tool.attributes.attrs['.body'].fill : '#000', {
                delay: 500,
                duration: 1000,
                valueFunction: joint.util.interpolate.hexColor,
                timingFunction: joint.util.timing.inout
            });
            link.on('transition:end', function(shifted_link, path) {
                shifted_link.transition('attrs/.connection/stroke', shifted_link.ts_properties.count % 2 === 0 ? 
                                                                            source_tool !== undefined ? source_tool.attributes.attrs['.body'].fill : '#fff':
                                                                            target_tool !== undefined ? target_tool.attributes.attrs['.body'].fill : '#000', {
                    delay: 500,
                    duration: 1000,
                    valueFunction: joint.util.interpolate.hexColor,
                    timingFunction: joint.util.timing.inout
                });

                shifted_link.ts_properties.count += 1;

                if (shifted_link.ts_properties.count >= 2) {
                    shifted_link.ts_properties.count = 0;
                }
            });

            self.model.addCell(link);
        };

        /* generateTools
        Creates and embeds an array of tools based on metadata.
      */self.generateTools = function(args) {
            if (args.metadata === undefined) { return; }

            var tools = [];
            var metadata = args.metadata;
            for (var i = 0; i < args.repeat; i++) {
                var ToolType = null;
                if (metadata.ToolType instanceof Array) {
                    ToolType = metadata.ToolType[i];
                }
                else {                    
                    ToolType = metadata.ToolType;
                }
                var tool = new ToolType({
                    position: { x: args.orientation === 'horizontal' ? args.position.x+(i*args.offset) : args.position.x,
                                y: args.orientation === 'horizontal' ? args.position.y : args.position.y_(i*args.offset) },
                    size: { width: metadata.width, height: metadata.height },
                    inPorts: metadata.inPorts,
                    outPorts: metadata.outPorts,
                    attrs: {
                        '.label': { text: metadata.name instanceof Array ? metadata.name[i] : 'no name',
                                    // 'ref-x': 0.2, 'ref-y': 0.35,
                                    'font-size': metadata['font-size'] === undefined ? 20 : metadata['font-size'],
                                    fill: 'white', 'font-weight': 'bold' },
                        '.inPorts circle': { fill: 'white', opacity: 0.9, magnet: 'passive', type: 'input' },
                        '.outPorts circle': { fill: 'black', opacity: 0.9, type: 'output' },
                        '.inPorts text, .outPorts text': { 'font-size': 14, 'font-weight': 'bold'  },
                        '.body': { fill: metadata.fill instanceof Array ? metadata.fill[i] : metadata.fill },
                        text: {
                            fill: 'white',
                            'pointer-events': 'none'
                        }
                    }
                });

                tool.attr('rect/filter', {name: 'dropShadow', args: {dx: 3, dy: 3, blur: 3}})

                tool.ts_properties = {  type: metadata.type,
                                        name: metadata.name,
                                        position: tool.attributes.position,
                                        _pid: metadata.parent !== undefined ? metadata.parent.id : undefined };

                if (metadata.parent !== undefined) metadata.parent.embed(tool);

                self.components[metadata.name] = tool;
                tools.push(tool);
            }

            return tools;
        };

        /* changeInspectorColor
        Changes the color of the inspector based ont he selected cell view.
      */self.changeInspectorColor = function(cellView) {
            if (!self.inspector) return;

            var cell = cellView.model;
            $('.inspector .btn-list-add').css('border', '2px solid '+cell.attributes.attrs['.body'].fill);
            if ($('.inspector .btn-list-del').text() !== 'x') {
                $('.inspector .btn-list-del').text('x');
            }
            $('.inspector .btn-list-del').css('border', '2px solid '+cell.attributes.attrs['.body'].fill);
            $('.inspector .btn-list-del').css('padding-right', '0.9em');
            $('.inspector .group > .group-label').css('border', '2px solid '+cell.attributes.attrs['.body'].fill);
            $('.inspector .list-item').css('border', '2px solid '+cell.attributes.attrs['.body'].fill);
            // .css("border", "-webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, #000), color-stop(100%, "+cell.attributes.attrs['.body'].fill+"))");
            // $('.inspector .btn-list-add').css("border", "-webkit-linear-gradient(top, #000 0%,"+cell.attributes.attrs['.body'].fill+" 100%)");
            // $('.inspector .btn-list-add').css("border", "-moz-linear-gradient(top, #000 0%,"+cell.attributes.attrs['.body'].fill+" 100%)");
            // $('.inspector .btn-list-add').css("border", "-o-linear-gradient(top, #000 0%,"+cell.attributes.attrs['.body'].fill+" 100%)");
            // $('.inspector .btn-list-add').css("border", "linear-gradient(top, #000 0%,"+cell.attributes.attrs['.body'].fill+" 100%)");
        }

        /* openIHF
        Displays the attributes of a selected cell.
      */self.openIHF = function(cellView) {
            // No need to re-render inspector if the cellView didn't change.
            if ((!self.inspector || self.inspector.options.cellView !== cellView)) {
                if (cellView.model instanceof joint.shapes.toolset.Link) {return;}

                var changed = null;
                if (self.inspector) {
                    // Clean up the old inspector if there was one.
                    self.inspector.remove();
                }

                var type = cellView.model.get('type');
                var command_name = cellView.model.get('sdk_props/command_name');

                self.inspector = new joint.ui.Inspector({
                    cellView: cellView,
                    inputs: inputs[type],
                    live: true,
                    groups: {
                        general: { label: command_name, index: 1 },
                        'input modifiers': { label: 'Input Modifiers', index: 2 },
                        'output modifiers': { label: 'Output Modifiers', index: 3 }
                    }
                });

                self.inspector.on('render', function() {
                    self.changeInspectorColor(cellView);
                });
                $('#inspector-container').append(self.inspector.render().el);
                self.changeInspectorColor(cellView);

            }

            if (cellView.model instanceof joint.shapes.devs.Model && !self.selection.contains(cellView.model)) {
                var halo = new joint.ui.Halo({
                    cellView: cellView,
                    boxContent: function(cellView) {
                        return cellView.model.get('type');
                    }
                }).render();

                self.selectionView.cancelSelection();
                self.selection.reset([cellView.model], { safe: true });

                if (self.NAM !== undefined) {
                    if (cellView.model.id === self.NAM.id) {
                        cellView.model.toBack();
                        halo.removeHandle('clone');
                        return;
                    }
                }

                var freeTransform = new joint.ui.FreeTransform({ cellView: cellView }).render();
            }
        }

        /* generateNAM
        Instantiates the JointJS elements used to represent the NAM Macrotool.
      */self.generateNAM = function(NAM){
            var do_embed = true;
            if (NAM === undefined){
                do_embed = false;
                var NAM = new joint.shapes.toolset.Macrotool_NAM({
                    position: { x: 50, y: 10},//self.workspace.$el.height()/5 },
                    size: { width: 400, height: 350 },
                    inPorts: ['from network'],
                    outPorts: ['to network'],
                    attrs: {
                            '.label': { text: 'NAM',
                                        // 'ref-x': 0.2, 'ref-y': 0.35,
                                        fill: 'white', 'font-size': 20, 'font-weight': 'bold' },
                            '.inPorts circle': { fill: 'white', opacity: 0.9, magnet: 'passive', type: 'input' },
                            '.outPorts circle': { fill: 'black', opacity: 0.9, type: 'output' },
                            '.inPorts text, .outPorts text': { 'font-size': 10, 'font-weight': 'bold'  },
                            '.body': { fill: '#449933', opacity: 1.0, 'stroke-width': 2.0 }
                    }
                });    
            }

            var ioGateway_width = 5.0*NAM.attributes.size.width/8.0;
            var ioGateway_height = NAM.attributes.size.height/7.0;
            var ioGateway = new joint.shapes.toolset.Component_ioGateway({
                position: { x: NAM.attributes.position.x+(NAM.attributes.size.width - ioGateway_width)/2.0,
                            y: NAM.attributes.position.y+(NAM.attributes.size.height - ioGateway_height)/20.0 },
                size: { width: ioGateway_width, height: ioGateway_height },
                outPorts: ['from network', 'to/from Semaphore', 'to network'],
                // inPorts: ['in'],
                attrs: {
                        '.label': { text: 'IO Gateway',
                                    'ref-x': 0.35, 'ref-y': 0.275,
                                    fill: 'white', 'font-size': 16, 'font-weight': 'bold' },
                        '.inPorts circle': { fill: 'white', opacity: 0.9, magnet: 'passive', type: 'input' },
                        '.outPorts circle': { fill: 'black', opacity: 0.9, type: 'output' },
                        '.inPorts text, .outPorts text': { 'font-size': 10, 'font-weight': 'bold'  },
                        '.body': { fill: '#3D6336', opacity: 0.8, 'stroke-width': 2.0 }
                }
            });
            ioGateway.attr({rect:{style:{'pointer-events':'none'}}});
            ioGateway.toFront();

            if (do_embed)
                NAM.embed(ioGateway);

            var semaphore_width = NAM.attributes.size.width/3;
            var semaphore_height = NAM.attributes.size.height/8;
            var semaphore = new joint.shapes.toolset.Component_semaphore({
                position: { x: NAM.attributes.position.x+(NAM.attributes.size.width - semaphore_width)/2.0,
                            y: NAM.attributes.position.y+3*(NAM.attributes.size.height - semaphore_height)/7.0 },
                size: { width: semaphore_width, height: semaphore_height },
                outPorts: ['to/from Analytic(s)'],
                inPorts: ['to/from IO Gateway'],
                attrs: {
                        '.label': { text: 'Semaphore',
                                    'ref-x': 0.25, 'ref-y': 0.375,
                                    fill: 'white', 'font-size': 16, 'font-weight': 'bold' },
                        '.inPorts circle': { fill: 'white', opacity: 0.9, magnet: 'passive', type: 'input' },
                        '.outPorts circle': { fill: 'black', opacity: 0.9, type: 'output' },
                        '.inPorts text, .outPorts text': { 'font-size': 10, 'font-weight': 'bold'  },
                        '.body': { fill: '#3D6336', opacity: 0.8, 'stroke-width': 2.0 }
                }
            }); //#B7C910
            semaphore.attr({rect:{style:{'pointer-events':'none'}}});
            semaphore.toFront();
            
            if (do_embed)
                NAM.embed(semaphore);

            var analytic_width = 100.0, analytic_height = 80.0;
            var repeat = 3, offset = 120;
            var analytics = self.generateTools( {   
                                        repeat: repeat,
                                        orientation: 'horizontal',
                                        position: { x: NAM.attributes.position.x+offset/(repeat+1),//(NAM.attributes.size.width - analytic_width)/5.0,
                                                    y: NAM.attributes.position.y+9.0*(NAM.attributes.size.height - analytic_height)/10.0 },
                                        offset: offset,
                                        metadata: {
                                            parent: undefined,
                                            ToolType:   [
                                                            joint.shapes.toolset.Component_sqliAnalytic,
                                                            joint.shapes.toolset.Component_portscanAnalytic,
                                                            joint.shapes.toolset.Component_ddosAnalytic,
                                                        ],
                                            name:   [
                                                        'SQL Injection', 'Port Scan', 'DDOS'                                                     
                                                    ],
                                            type: 'Macrotool',
                                            width: analytic_width,
                                            height: analytic_height,
                                            inPorts: ['IO'],
                                            // outPorts: [''],
                                            fill: ['#E6A119', '#E6A119', '#E6A119'],
                                            'font-size': 14,
                                            edges: []
                                        }
                                    });
            analytics[0].attr({rect:{style:{'pointer-events':'none'}}});
            analytics[0].toFront();
            analytics[1].attr({rect:{style:{'pointer-events':'none'}}});
            analytics[1].toFront();
            analytics[2].attr({rect:{style:{'pointer-events':'none'}}});
            analytics[2].toFront();

            if (do_embed) {
                NAM.embed(analytics[0]);
                NAM.embed(analytics[1]);
                NAM.embed(analytics[2]);
            }

            var links = {
                from_NAM_to_ioGateway: new joint.shapes.toolset.Link({
                                                    source: { id: NAM.id, selector: NAM.getPortSelector('from network') },
                                                    target: { id: ioGateway.id, selector: ioGateway.getPortSelector('from network') },
                                                    router: { name: 'metro' },
                                                    // connector: { name: 'smooth' }
                }),
                from_ioGateway_to_semaphore: new joint.shapes.toolset.Link({
                                                    source: { id: ioGateway.id, selector: ioGateway.getPortSelector('to/from Semaphore') },
                                                    target: { id: semaphore.id, selector: semaphore.getPortSelector('to/from IO Gateway') },
                                                    router: { name: 'metro' },
                                                    // connector: { name: 'smooth' }
                }),
                from_ioGateway_to_NAM: new joint.shapes.toolset.Link({
                                                    source: { id: ioGateway.id, selector: ioGateway.getPortSelector('to network') },
                                                    target: { id: NAM.id, selector: NAM.getPortSelector('to network') },
                                                    router: { name: 'metro' },
                                                    // connector: { name: 'smooth' }
                })
            }

            // for (var i = 0; i < links.length; i++) {
            //     if (do_embed) {
            //         NAM.embed(links[i]);
            //     }
            //     links[i].toFront();
            // }

            links.from_NAM_to_ioGateway.attr({
                '.connection': { stroke: '#E74C3C', 'stroke-width': 5 },
                '.connection-wrap': { stroke: '#1E242B', 'stroke-width': 2 },
                '.marker-source': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 10 0 L 0 5 L 10 10 z' },
                '.marker-target': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 10 0 L 0 5 L 10 10 z' }
            });

            links.from_ioGateway_to_semaphore.attr({
                '.connection': { stroke: '#E74C3C', 'stroke-width': 5 },
                '.connection-wrap': { stroke: '#1E242B', 'stroke-width': 2 },
                '.marker-source': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 10 0 L 0 5 L 10 10 z' },
                '.marker-target': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 10 0 L 0 5 L 10 10 z' }
            });

            links.from_ioGateway_to_NAM.attr({
                '.connection': { stroke: '#E74C3C', 'stroke-width': 5 },
                '.connection-wrap': { stroke: '#1E242B', 'stroke-width': 2 },
                '.marker-source': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 10 0 L 0 5 L 10 10 z' },
                '.marker-target': { stroke: '#E74C3C', fill: '#E74C3C', d: 'M 10 0 L 0 5 L 10 10 z' }
            });

            var components = {
                NAM: NAM,
                ioGateway: ioGateway,
                semaphore: semaphore,
                sqliAnalytic: analytics[0],
                portscanAnalytic: analytics[1],
                ddosAnalytic: analytics[2],
                links: links
            };
  
            return components;
        },

        /* initialize
        Instantiates the JointJS elements used to represent the design.
      */self.initialize = function(){
            self.model = new joint.dia.Graph;
            self.commandManager = new joint.dia.CommandManager({ graph: self.model });
            self.workspace = new joint.dia.Paper({
                width: $('#paper-container').innerWidth(),
                height: $('#paper-container').innerHeight(),
                // el: $('#paper-container'),
                model: self.model,
                gridSize: 1,
                // Enable link snapping within 25px lookup radius
                snapLinks: { radius: 25 },
                // perpendicularLinks: true,
                defaultLink: new joint.shapes.toolset.Link,
                // Enable marking available cells & magnets
                markAvailable: true,
                validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {

                    // don't allow link to link connection
                    if (cellViewT instanceof joint.dia.LinkView) return false;
                    // Prevent linking from input ports.
                    if (magnetS && magnetS.getAttribute('type') === 'input') return false;
                    // Prevent linking from output ports to input ports within one element.
                    if (cellViewS === cellViewT) return false;
                    // Prevent linking to input ports.
                    return magnetT && magnetT.getAttribute('type') === 'input';
                }

                }).on({

                    'blank:pointerdown': function(evt,x,y) {

                        if (_.contains(KeyboardJS.activeKeys(), 'shift')) {
                            self.selectionView.startSelecting(evt, x, y);
                        } else {
                            self.selectionView.cancelSelection();
                            self.paperScroller.startPanning(evt, x, y);
                        }
                    },

                    'cell:pointerdown': function(cellView, evt) {

                        // Select an element if CTRL/Meta key is pressed while the element is clicked.
                        if ((evt.ctrlKey || evt.metaKey) && cellView.model instanceof joint.dia.Element) {
                            self.selection.add(cellView.model);
                            self.selectionView.createSelectionBox(cellView);
                        }
                    },

                    'cell:pointerup': function(cellView) {
                        self.openIHF(cellView);                            
                        
                    }
            });

            self.paperScroller = new joint.ui.PaperScroller({
                autoResizePaper: true,
                padding: 50,
                paper: self.workspace
            });

            self.paperScroller.$el.appendTo('#paper-container');

            self.paperScroller.center();

            self.selection = (new Backbone.Collection).on({
                'reset': function(cells, opt) {
                    if (opt.safe) return;

                    // don't allow any pool to be selected by area selection
                    var pools = cells.filter(function(cell) {
                        return (cell instanceof joint.shapes.bpmn.Pool);
                    });

                    if (!_.isEmpty(pools)) {

                        cells.reset(cells.without.apply(cells, pools), { safe: true });

                        _.chain(pools).map(self.workspace.findViewByModel, self.workspace).filter()
                            .map(self.selectionView.destroySelectionBox, self.selectionView);
                    }
                }
            });

            self.selectionView = new joint.ui.SelectionView({
                paper: self.workspace,
                graph: self.model,
                model: self.selection
            })
            self.selectionView.addHandle({ name: 'make_macrotool', position: 's', icon: 'images/macrotool.png' });
            self.selectionView.addHandle({ name: 'bind_to_host', position: 'se', icon: 'images/hosts.png' });
            
            self.selectionView.on('action:make_macrotool:pointerdown', function(evt) {
                evt.stopPropagation();
                console.log('Make Macrotool.');
            });

            self.selectionView.on('action:bind_to_host:pointerdown', function(evt) {
                evt.stopPropagation();
                console.log('Bind to host.');
            });

            self.selectionView.on({
                'selection-box:pointerdown': function(evt) {
                    // Unselect an element if the CTRL/Meta key is pressed while a selected element is clicked.
                    if (evt.ctrlKey || evt.metaKey) {
                        var cell = self.selection.get($(evt.target).data('model'));
                        self.selection.reset(self.selection.without(cell));
                        self.selectionView.destroySelectionBox(self.workspace.findViewByModel(cell));
                    }
                }
            });

            /* STENCIL */
            self.stencil = new joint.ui.Stencil({
                graph: self.model,
                paper: self.workspace,
                search: {
                     '*': ['sdk_props/command_name'],
                     '*': ['sdk_props/command'],
                     'basic.Image': ['description'],
                     'basic.Path': ['description']
                },
                groups: {
                    source: { label: 'Source', index: 1 },
                    analysis: { label: 'Analysis', index: 2, closed: true },
                    splitter: { label: 'Splitter', index: 3, closed: true },
                    merger: { label: 'Merger', index: 4, closed: true },
                    sink: { label: 'Sink', index: 5, closed: true },
                    macrotools: { label: 'Macrotools', index: 6, closed: true }
                }
            });

            $('#stencil-container').append(self.stencil.render().el);

            var source_width = 175, source_height = 100;
            var repeat = 5, offset = 200;
            var source_tools = self.generateTools( {   
                                        repeat: repeat,
                                        orientation: 'horizontal',
                                        position: { x: 50,
                                                    y: 10 },
                                        offset: offset,
                                        metadata: {
                                            parent: undefined,
                                            ToolType:   [   joint.shapes.toolset.Source_custom,
                                                            joint.shapes.toolset.Source_cvcamcapture,
                                                            joint.shapes.toolset.Source_floatgen,
                                                            joint.shapes.toolset.Source_fpulse,
                                                            joint.shapes.toolset.Source_flocksim
                                                        ],
                                            name:   [
                                                        'custom', 'cvcamcapture', 'floatgen', 'fpulse', 'flocksim'                                                     
                                                    ],
                                            type: 'Source',
                                            width: source_width,
                                            height: source_height,
                                            inPorts: [],    
                                            outPorts: [''],
                                            fill: ['#70C270', '#40BF40', '#29A329', '#178217', '#0A5C0A'],
                                            edges: []
                                        }
                                    });
            console.log('hallo');

            var analysis_width = 100, analysis_height = 100;
            var repeat = 4, offset = 200;
            var analysis_tools = self.generateTools( {   
                                        repeat: repeat,
                                        orientation: 'horizontal',
                                        position: { x: 50,
                                                    y: 10 },
                                        offset: offset,
                                        metadata: {
                                            parent: undefined,
                                            ToolType:   [   joint.shapes.toolset.Analysis_custom,
                                                            joint.shapes.toolset.Analysis_cvdetect,
                                                            joint.shapes.toolset.Analysis_cvcanny,
                                                            joint.shapes.toolset.Analysis_numproc
                                                        ],
                                            name:   [
                                                        'custom', 'cvdetect', 'cvcanny', 'numproc'                                                     
                                                    ],
                                            type: 'Analysis',
                                            width: analysis_width,
                                            height: analysis_height,
                                            inPorts: [''],
                                            outPorts: [''],
                                            fill: ['#D9A326', '#B88714', '#C28B0A', '#CC8F00'],
                                            edges: []
                                        }
                                    });
            var splitter_width = 100, splitter_height = 100;
            var repeat = 3, offset = 200;
            var splitter_tools = self.generateTools( {   
                                        repeat: repeat,
                                        orientation: 'horizontal',
                                        position: { x: 50,
                                                    y: 10 },
                                        offset: offset,
                                        metadata: {
                                            parent: undefined,
                                            ToolType:   [   joint.shapes.toolset.Splitter_custom,
                                                            joint.shapes.toolset.Splitter_bxcat,
                                                            joint.shapes.toolset.Splitter_zmqpub
                                                        ],
                                            name:   [
                                                        'custom', 'bxcat', 'zmqpub'                                                  
                                                    ],
                                            type: 'Splitter',
                                            width: splitter_width,
                                            height: splitter_height,
                                            inPorts: [''],
                                            outPorts: [''],
                                            fill: ['#C27870', '#BF4C40', '#A33529'],
                                            edges: []
                                        }
                                    });

            
            var merger_width = 100, merger_height = 100;
            var repeat = 3, offset = 200;
            var merger_tools = self.generateTools( {   
                                        repeat: repeat,
                                        orientation: 'horizontal',
                                        position: { x: 50,
                                                    y: 10 },
                                        offset: offset,
                                        metadata: {
                                            parent: undefined,
                                            ToolType:   [   joint.shapes.toolset.Merger_custom,
                                                            joint.shapes.toolset.Merger_bxcat,
                                                            joint.shapes.toolset.Merger_zmqsub
                                                        ],
                                            name:   [
                                                        'custom', 'bxcat', 'zmqsub'                                                     
                                                    ],
                                            type: 'Merger',
                                            width: merger_width,
                                            height: merger_height,
                                            inPorts: [''],
                                            outPorts: [''],
                                            fill: ['#A170C2', '#8C40BF', '#8B0AC2'],
                                            edges: []
                                        }
                                    });

            var sink_width = 100, sink_height = 100;
            var repeat = 4, offset = 200;
            var sink_tools = self.generateTools( {   
                                        repeat: repeat,
                                        orientation: 'horizontal',
                                        position: { x: 50,
                                                    y: 10 },
                                        offset: offset,
                                        metadata: {
                                            parent: undefined,
                                            ToolType:   [   joint.shapes.toolset.Sink_custom,
                                                            joint.shapes.toolset.Sink_svdemgl,
                                                            joint.shapes.toolset.Sink_cvshow,
                                                            joint.shapes.toolset.Sink_hexcat
                                                        ],
                                            name:   [
                                                        'custom', 'svdemgl', 'cvshow', 'hexcat'                                                     
                                                    ],
                                            type: 'Sink',
                                            width: sink_width,
                                            height: sink_height,
                                            inPorts: [''],
                                            outPorts: [],
                                            fill: ['#70A9C2', '#4099BF', '#297EA3', '#176282'],
                                            edges: []
                                        }
                                    });

           
            //+ Keep a global-ish list of the UI elements used for parenting and the Tools that are available.
            self.workspace.ts_properties = { parents: {}, tools: [] };
            //-
            
            self.stencil.load(source_tools, 'source');
            self.stencil.load(analysis_tools, 'analysis');
            self.stencil.load(splitter_tools, 'splitter');
            self.stencil.load(merger_tools, 'merger');
            self.stencil.load(sink_tools, 'sink');

            components = self.generateNAM();
            self.stencil.load([components.NAM, components.ioGateway, components.semaphore, components.sqliAnalytic, components.portscanAnalytic, components.ddosAnalytic], 'macrotools');

            /* CELL ADDED: after the view of the model was added into the paper */
            self.model.on('add', function(cell, collection, opt) {

                // TODO: embedding after an element is dropped from the stencil. There is a problem with
                // the command manager and wrong order of actions (embeding, parenting, adding and as it
                // must be 3,1,2) in one batch. Can't be done silently either (becoming an attribute
                // of an element being added) because redo action of `add` (=remove) won't reset the parent embeds.
                // --embedInPool(cell);

                if (!opt.stencil) return;


                var view = self.workspace.findViewByModel(cell);
                if ((cell.attributes.type === 'toolset.Macrotool_NAM') && (self.NAM === undefined)) {
                    components = self.generateNAM(cell);
                    self.model.addCell(components.ioGateway);
                    self.model.addCell(components.semaphore);
                    self.model.addCell(components.sqliAnalytic);
                    self.model.addCell(components.portscanAnalytic);
                    self.model.addCell(components.ddosAnalytic);
                    self.model.addCells(components.links);
                    self.NAM = cell;
                    view.update();

                } else if ((cell.attributes.type === 'toolset.Macrotool_NAM') && (self.NAM !== undefined)) {
                    // Don't allow more than one instance of NAM.
                    view.remove();
                    return;
                }

                if (view) self.openIHF(view);

    
            });
            self.model.on('remove', function(cell, collection, opt) {
                // Currently, only looking for NAM. 
                if (self.NAM === undefined) return;
                if (cell.id === self.NAM.id) {
                    self.NAM = undefined;
                }
            });

            // Clipboard.
            // ----------

            self.clipboard = new joint.ui.Clipboard;
            KeyboardJS.on('ctrl + c', function() {
                // Copy all selected elements and their associated links.
                self.clipboard.copyElements(self.selection, self.model, { translate: { dx: 20, dy: 20 }, useLocalStorage: true });
            });
            KeyboardJS.on('ctrl + v', function() {
                self.clipboard.pasteCells(self.model);

                self.selectionView.cancelSelection();

                self.clipboard.pasteCells(self.model, { link: { z: -1 }, useLocalStorage: true });

                // Make sure pasted elements get selected immediately. This makes the UX better as
                // the user can immediately manipulate the pasted elements.
                self.clipboard.each(function(cell) {

                    if (cell.get('type') === 'link') return;

                    // Push to the selection not to the model from the clipboard but put the model into the graph.
                    // Note that they are different models. There is no views associated with the models
                    // in clipboard.
                   self.selection.add(self.model.get('cells').get(cell.id));
                });

                self.selection.each(function(cell) {
                    self.selectionView.createSelectionBox(self.workspace.findViewByModel(cell));
                });
            });

            /* KEYBOARD */

            KeyboardJS.on('delete, backspace', function(evt) {

                if (!$.contains(evt.target, self.workspace.el)) return;

                self.commandManager.initBatchCommand();
                self.selection.invoke('remove');
                self.commandManager.storeBatchCommand();
                self.selectionView.cancelSelection();
            });

            // Disable context menu inside the paper.

            // This prevents from context menu being shown when selecting individual elements with Ctrl in OS X.
            self.workspace.el.oncontextmenu = function(evt) { evt.preventDefault(); };


            $('#toolbar-container [data-tooltip]').each(function() {

                new joint.ui.Tooltip({
                    target: $(this),
                    content: $(this).data('tooltip'),
                    top: '#toolbar-container',
                    direction: 'top'
                });
            });

            self.toolbar = {
                 toJSON: function() {

                    var windowFeatures = 'menubar=no,location=no,resizable=yes,scrollbars=yes,status=no';
                    var windowName = _.uniqueId('json_output');
                    var jsonWindow = window.open('', windowName, windowFeatures);

                    jsonWindow.document.write(JSON.stringify(self.model.toJSON()));
                },

                loadGraph: function() {
                    var pom = document.createElement('input');
                    pom.setAttribute('type', 'file');
                    pom.click();

                    pom.onchange = function(e) {
                        var file = $(pom)[0].files[0];
                        if (file) {
                            self.model.clear();
                            var reader = new FileReader();
                            reader.readAsText(file, "UTF-8");
                            reader.onload = function (evt) {
                                self.model.fromJSON(JSON.parse(evt.target.result));

                                var elements = self.model.getElements();
                                for (var i = 0; i < elements.length; i++) {
                                    var element = elements[i];

                                    if (element.attributes.type === 'toolset.Macrotool_NAM') {
                                        if (self.NAM === undefined) {
                                            self.NAM = element;
                                        } else {
                                            console.log("REMOVE NAM", element);
                                            element.remove();
                                        }
                                    }
                                }

                                var links = self.model.getLinks();

                                for (var i = 0; i < links.length; i++) {
                                    var link = links[i];
                                    
                                    self.createConnection(link);
                                }
                            };
                            reader.onerror = function (evt) {
                                console.log('load error:', evt);
                            }
                        }
                    }
                },

                saveGraph: function() {
                    var pom = document.createElement('a');
                    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(self.model.toJSON())));
                    pom.setAttribute('download', 'graph.json');
                    pom.click();
                }
            };

            return;
        }

        /* registerEvents
        Connects UI events to behaviors.
        */self.registerEvents = function(){
            // $(window).resize(startResize);
            //- Resize window events. Scale elements.
            
            //+ Exit event.
            // Reports this event to both the user (for confirmation) and the server (for cleanup).
            // Suggested here: http://stackoverflow.com/questions/1704533/intercept-page-exit-event
            window.onbeforeunload = function(e) {
                var message = "Closing the SDK visual designer.",
                    e = e || window.event;

                // For IE and Firefox
                if (e) {
                    e.returnValue = message;
                }

                // For Safari
                return message;
            };
            //- Exit event.


//+ Model Events
            // + Remove links that are not fully specified.
            self.model.on('batch:stop', function () {
                var links = self.model.getLinks();
                _.each(links, function (link) {
                    var source = link.get('source');
                    var target = link.get('target');
                    if (source.id === undefined || target.id === undefined) {
                        link.remove();
                    }
                });
            });
            //- Remove bad links.

            self.model.on('add:link change:source change:target', function(link) {
                self.createConnection(link);
            });

            self.model.on('remove', function(element){
                if (element instanceof joint.shapes.toolset.Link){
                    var link = element;
                    self.deleteConnection(link);
                }
            });

            function out(m) {
                $('#statusbar-container').html(m);
            }
//- Model Events
        }

        self.executeDesign = function(event) {
            var NAM_connections = self.workspace.model.getConnectedLinks(self.components['NAM']);
            if (NAM_connections.length > 3) {
                /* Too many connections to this component.*/
                return
            }
        }
    });

    app.directive("workspace", function() {
        return {
          restrict: 'E',
          templateUrl: "jointjs-workspace.html"
        };
    });


})();