/*
Evin Ozer
11/19/2014
*/

var SneakPeek = function(configuration) {
    var self = this;
    self.configuration = configuration;
    
    //+ THREE.JS
    self.debug = false;
    self.stop = false;

    self.renderer = null;
    self.scene = null;
    self.camera = null;
    self.headlight = null;
    self.controls = null;
    self.clock = new THREE.Clock();
    //- THREE.JS

    //+ GUI
    self.effectController = null;
    //- GUI
  
    //+ STATE
    self.localhost = configuration['localhost'];
    self.hosts = [];
    self.hosts_to_ids = {};
    self.shosts = [];
    self.dhosts = [];

    self.sessions = [];
    self.edges_to_ids = {};
    self.intersected = null;
    self.selected_node = null;

    self.macs_to_graphNodes = {};

    self.file_data = {};
    //- STATE

    //+ Schema (Nodes)
    self.node_uuids = [];
    self._nodes = [];
    self.selected_node = null;
    self.baseNodeColor = 0x3333ff;
    self.intersectNodeColor = 0xaa00aa;

    self.nodes = new THREE.Object3D();
    self.node_geometry = new THREE.SphereGeometry(20, 20, 20);
    self.node_material = new THREE.MeshNormalMaterial();//{color:0xffffff, specular: 0x111111, transparent: true, opacity: 0.85});
    //- Schema (Nodes)
    
    //+ Schema (Edges)
    self.edge_uuids = [];
    self._edges = [];
    self.selected_edge = null;
    self.baseEdgeColor = 0x00ff00;
    self.intersectEdgeColor = 0xffffff;
    self.transmitEdgeColor = 0x00ffff;
    self.receiveEdgeColor = 0xffff00;
    self.edges = new THREE.Object3D();
    self.edge_geometry = new THREE.BoxGeometry(8, 8, 8);
    self.edge_material = new THREE.MeshPhongMaterial({color:self.transmitEdgeColor});
    //- Schema (Nodes)

    /* objectify
        Constructs an object from an array.
  */self.objectify = function(obj, val, index) {
        obj[index] = val;
        return obj;
    };

    self.on_change_header = function() {
        console.log('changed header');
    };

    self.initialize = function(do_) {
        self.utility = new SneakPeek.Utility();
        self.ui = new SneakPeek.UI({
            peek: self.fill_scene,
            parse_file_pcap: self.parse_file_pcap,
            clear_cache: self.clear_cache
        });

        self.ui.initialize();

        self.messager = new SneakPeek.Messager({
            remote_zmq_host: configuration['remote_zmq_host'],
            peek: self.fill_scene,
            update_file_list: self.ui.update_pcap_table,
            update_settings: self.ui.update_settings,
            display_metadata: self.ui.update_pcap_file_data,
            get_file_info: self.get_file_info
        });

        self.ui.toggle_live_capture = self.messager.toggle_live_capture;

        // make a new graph
        self.reset_springy_graph();
        self.reset_octree();

        self.initialize_dropzone();

        /* Create the frustum of a perspective camera.
         *   fov     -   75          Vertical field of view = 75 degrees
         *   aspect  -   (iw / ih)   Aspect ratio.
         *   near    -   0.1         Near plane.
         *   far     -   1000        Far plane.
         */
        var scene_container = document.getElementById( 'scene-container' );

        // Initialize the graphical back-end that will render the scene.
        var scene_canvas = document.getElementById( 'scene' );
        self.renderer = new THREE.WebGLRenderer( { canvas: scene_canvas, antialias: true, maxLights: 10 } );
        console.log(self.renderer)
        // Set the size of the renderer to match the inner width and inner height of the window.
        self.renderer.setSize(scene_container.offsetWidth, scene_container.offsetHeight);
        self.renderer.setClearColor( 0x111111, 1.0 );
        // document.body.appendChild(self.renderer.domElement);

        self.renderer.gammaInput = true;
        self.renderer.gammaOutput = true;
        self.renderer.shadowMapEnabled = true;

        self.camera = new THREE.PerspectiveCamera( 45, scene_container.offsetWidth / scene_container.offsetHeight, 1, 80000 );
        // self.camera.rotation.x = 90 * Math.Pi/180;
        // self.camera.position.y = 800;
        self.camera.position.z -= 800;
        self.controls = new THREE.TrackballControls(self.camera, self.renderer.domElement);

        
        // self.controls.rotateSpeed = 10.0;
        // self.controls.zoomSpeed = 1.2;
        // self.controls.panSpeed = 0.8;

        // self.controls.noZoom = false;
        // self.controls.noPan = false;

        // self.controls.dynamicDampingFactor = 0.3;
         // Create a scene where objects, cameras, and lights can be placed.
        self.scene = new THREE.Scene();
        // self.scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );
        // Set lights in scene.    
        self.addLights();

        self.setupGui();
        self.messager.initialize_connection();

        self.nodes.name = "Nodes";
        self.scene.add(self.nodes);
        self.nodes.rotation.x = 90 * Math.PI/180.0;

        self.edges.name = "Edges";
        self.scene.add(self.edges);
        self.edges.rotation.x = 90 * Math.PI/180.0;

        // Event Handling
        self.initEventHandling();

        /* Begin the application. */
        self.update();
    };

    self.reset_springy_graph = function() {
        if (self.__springy_renderer !== undefined ){
            self.__springy_renderer.stop();
        }

        self.graph = new Springy.Graph();
        self.layout = new Springy.Layout.ForceDirected(
            self.graph,
            100.0, // Spring stiffness.
            200.0, // Node repulsion.
            0.5    // Damping
        );

        self.__springy_renderer = new Springy.Renderer(
            self.layout,
            function clear() {
                // code to clear screen
            },
            function drawEdge(edge, p1, p2) {
                // console.log(edge);
                // console.log(p1);
                // console.log(p2);

                self.fill_scene();
            },
            function drawNode(node, p) {
                // console.log(node);
                // console.log(p);

                var threejs_node_id = self.hosts_to_ids[node.data.label];
                var src_node = self.scene.getObjectById(threejs_node_id);

                if ((src_node === null) || (src_node === undefined)) { return; }
                src_node.position.x = 50*p.x;
                src_node.position.z = 50*p.y;

                self.octree.update();
            }
        );

        self.__springy_renderer.start();
    };

    self.reset_octree = function() {
            self.octree = new THREE.Octree({
            // uncomment below to see the octree (may kill the fps)
            //scene: scene,
            // when undeferred = true, objects are inserted immediately
            // instead of being deferred until next octree.update() call
            // this may decrease performance as it forces a matrix update
            undeferred: false,
            // set the max depth of tree
            depthMax: Infinity,
            // max number of objects before nodes split or merge
            objectsThreshold: 8,
            // percent between 0 and 1 that nodes will overlap each other
            // helps insert objects that lie over more than one node
            overlapPct: 0.05
        });
    }

    self.initialize_dropzone = function() {
        // instantiate the uploader
        Dropzone.options.pcapDropzone = {
            maxFilesize: 200,
            dictDefaultMessage: "",
            paramName: "uploadfile",
            accept: function(file, done) {
                // if (file.name == "justinbieber.jpg") {
                //     done("Naha, you don't.");
                // }
                // else { done(); }

                done();
            },

            complete: function(file, json) {
                console.log("FILE:", file);
                console.log("JSON:", json);

                self.messager.request_pcap_file_table_update();
                self.parse_file_pcap(file);
            },

            addedfile: function(file) {
                // console.log(file);
            },

            drop: function(evt) {
                // console.log(evt);
            } 
        };
    };

    self.clear_cache = function(filename) {

        // self.nodes.traverse(function(child) {
        //     if ((child.name !== undefined) && (child.name !== null)) {
        //         if (child.name.filename === filename) {
        //             var ip_index = self.hosts.indexOf(child.name.ip);
        //             console.log(ip_index);
        //             if (ip_index !== -1) {
        //                 self.hosts.splice(ip_index, 1);
        //             }

        //             var ip_index = self.messager.shosts.indexOf(child.name.ip);
        //             if (ip_index !== -1) {
        //                 self.messager.shosts.splice(ip_index, 1);
        //             }

        //             var ip_index = self.messager.dhosts.indexOf(child.name.ip);
        //             if (ip_index !== -1) {
        //                 self.messager.dhosts.splice(ip_index, 1);
        //             }

        //             delete self.hosts_to_ids[child.name.ip];

        //             console.log(child);
        //             self.scene.remove(child);
        //             child = null;
        //             delete child;
        //             // child.name = undefined;
        //             console.log(child);
        //         }
        //     }
        // });
        
        // self.edges.traverse(function(child) {
        //     if ((child.name !== undefined) && (child.name !== null)) {
        //         if (child.name.filename === filename) {
        //             for (var i = 0; i < self.messager.sessions.length; i++) {
        //                 var session = self.messager.sessions[i];
        //                 if (session.filename === filename) {
        //                     self.messager.sessions.splice(i, 1);
        //                 }
        //             }

        //             delete self.edges_to_ids[child.name.ip];
                    
        //             self.scene.remove(child);                
        //             child.remove();
        //             delete child;
        //         }
        //     }
        // });

        // console.log(self.nodes);
        // console.log(self.edges);
        
        self.scene.remove(self.nodes);
        self.scene.remove(self.edges);
        self.nodes = new THREE.Object3D();
        self.edges = new THREE.Object3D();

        self.scene.add(self.nodes);
        self.scene.add(self.edges);
        self.nodes.rotation.x = 90 * Math.PI/180.0;
        self.edges.rotation.x = 90 * Math.PI/180.0;

        self.selected = null;

        self.reset_springy_graph();
        self.reset_octree();

        self.macs_to_graphNodes = {};
        self.shosts = []; self.dhosts = []; self.hosts = []; self.hosts_to_ids = {};
        self.sessions = []; self.edges_to_ids = {};
        self.messager.shosts = []; self.messager.dhosts = [];
        self.messager.sessions = [];
    };

    self.parse_file_pcap = function(file) {
        self.clear_cache();
        var now = new Date().toISOString();
        var message = {
            timestamp: now,
            source: "SneakPeek",
            destination: "Distiller",
            payload: {
                command: "parse_file_pcap",
                filename: file['name'],
                _modified_datetime: file['lastModified'],
                modified_datetime: file['lastModifiedDate'],
                size: file['size'],
                type: file['type'] !== undefined ? file['type'] : ''
            } 
        };

        self.messager.send_message(message);
    };

	self.setupGui = function() {

        self.effectController = {

        };

        var h;

        // var gui = new dat.GUI();

        // // material (attributes)

        // h = gui.addFolder( "Packet Control" );

        // h.add( self.effectController, "shininess", 1.0, 400.0, 1.0 ).name("m_shininess");
    };

    self.addLights = function() {
        // Add lights here
        self.lights = {};

        if (self.lights.ambient === undefined) {
            var ambient = new THREE.AmbientLight( 0xFFFFFF );

            self.lights.ambient = ambient;
            self.scene.add(ambient);
        }

        if (self.lights.directional === undefined) {
            self.lights.directionals = {}

            var num_directionals = 0;
            self.lights.directionals = [];
            for (var i = 0; i < num_directionals; i++) {
                var directional = new THREE.DirectionalLight( 0xFFFFFF, 1.0 );
                // directional.rotation.set( -90*Math.cos(i), 0, 0 );
                directional.position.set( 10*Math.cos(i), 10*Math.cos(i), 10*Math.sin(i) );

                self.scene.add(directional);
                self.lights.directionals.push(directional);
            }
        }

        if (self.lights.spots === undefined) {
            /*
                SpotLight(hex, intensity, distance, angle, exponent)

                    hex — Numeric value of the RGB component of the color. 
                    intensity — Numeric value of the light's strength/intensity. 
                    distance -- todo 
                    angle -- todo 
                    exponent -- todo

            */
            var num_spots = 0;
            self.lights.spots = [];
            for (var i = 0; i < num_spots; i++) {
                var spot = new THREE.SpotLight( 0xffffff, 1.0 );
                spot.add( new THREE.Mesh(
                    new THREE.SphereGeometry(20, 20, 20),
                    new THREE.MeshPhongMaterial({
                        ambient: 0xff0000, specular: 1.0, emissive: 0xffffff
                    })));

                spot.position.x -= 100*num_spots*Math.cos(i/(num_spots-1) * 2*Math.PI);
                // spot.position.y -= 100*num_spots*Math.sin(i/(num_spots-1) * 2*Math.PI);
                spot.position.z -= 100*num_spots*Math.sin(i/(num_spots-1) * 2*Math.PI);
                spot.rotation.x -= 90 * Math.PI/180;
                spot.castShadow = true;
                
                self.scene.add(spot);
                self.lights.spots.push(spot);
            }
        }

        if (self.lights.points === undefined) {
            /*
                PointLight(hex, intensity, distance)

                    hex — Numeric value of the RGB component of the color. 
                    intensity — Numeric value of the light's strength/intensity. 
                    distance -- The distance of the light where the intensity is 0. When distance is 0, then the distance is endless.
                    Creates a light at a specific position in the scene. The light shines in all directions (roughly similar to a light bulb.)

            */
            var num_points = 0;
            var colors = self.utility.generate_random_values(4, num_points, true);
            self.lights.points = [];
            
            for (var i = 0; i < num_points; i++) {
                var point = new THREE.SpotLight( 0xffffff, 1.0, 200 );
                point.add( new THREE.Mesh(
                    new THREE.SphereGeometry(20, 20, 20),
                    new THREE.MeshPhongMaterial({
                        ambient: 0xff0000, specular: 1.0, emissive: 0xffffff
                    })));

                point.position.x -= 100*num_points*Math.cos(i/(num_points-1) * 2*Math.PI);
                // spot.position.y -= 100*num_spots*Math.sin(i/(num_spots-1) * 2*Math.PI);
                point.position.z -= 100*num_points*Math.sin(i/(num_points-1) * 2*Math.PI);
                point.rotation.x -= 90 * Math.PI/180;
                point.castShadow = true;
                
                self.scene.add(point);
                self.lights.points.push(point);
            }
        }
    };

    self.fill_scene = function() {
        // var old_sources = self.shosts,
        var new_sources = self.messager.shosts,
            // old_destinations = self.dhosts,
            new_destinations = self.messager.dhosts,
            // old_sessions = self.sessions,
            new_sessions = self.messager.sessions;

        // self.sources_changed = old_sources.length < new_sources.length;
        // self.destinations_changed = old_destinations.length < new_destinations.length;
        // self.sessions_changed = old_sessions.length < new_sessions.length;
        // if (self.sources_changed || self.destinations_changed || self.sessions_changed) {
            // self.shosts = new_sources.slice();
            // self.dhosts = new_destinations.slice();
        self.generate_network(new_sources, new_destinations, new_sessions);
        // }

        return;
    };

    self.generate_network = function(shosts, dhosts, sessions) {
        self.sources_changed = false;
        self.destinations_changed = false;
        // return;
        // console.log("Generating Network");
        
        self.add_nodes(shosts, dhosts);

        self.sessions = sessions;
        self.add_edges(sessions);
    };

    self.add_nodes = function(shosts, dhosts) {
        var hosts = self.hosts.slice();
        var new_hosts = [];
        for (var s = 0; s < shosts.length; s++) {
            var shost = shosts[s];
            // console.log("SHOST:", shost);
            // console.log("HOSTS:", hosts);
           
            if ($.inArray(shost.mac, hosts) === -1) {
                self.hosts.push(shost.mac);
                new_hosts.push(shost);
            } else {
                var src_id = self.hosts_to_ids[shost.mac];
                var src_node = self.scene.getObjectById(src_id);
                // src_node.scale.z += 0.1;
                // src_node.scale.y += 0.1;
                // src_node.scale.x += 0.1;

                // src_node.geometry.computeFaceNormals();
            }
        } for (var d = 0; d < dhosts.length; d++) {
            var dhost = dhosts[d];
            // console.log("DHOST:", dhost);
            // console.log("HOSTS:", hosts);
            
            if ($.inArray(dhost.mac, hosts) === -1) {
                self.hosts.push(dhost.mac);
                new_hosts.push(dhost);
            } else {
                var dst_id = self.hosts_to_ids[dhost.mac];
                var dst_node = self.scene.getObjectById(dst_id);
                // dst_node.scale.z += 0.0001;
                // dst_node.scale.y += 0.0001;
                // dst_node.scale.x += 0.0001;

                // dst_node.geometry.computeFaceNormals();
            }
        }

        // console.log("SHOSTS:", shosts.length);
        // console.log("DHOSTS:", dhosts.length);
        for (var n = 0; n < new_hosts.length; n++) {
            var new_host = new_hosts[n];

            // if (self.node === undefined) {
            //     self.node = new THREE.Mesh(
            //         self.node_geometry,
            //         new THREE.MeshPhongMaterial({ambient: 0xffffff, color:0x0000ff, specular:0x1111ff})
            //     );

            // }

            if ((new_host.mac === null) || (new_host.mac === undefined)) continue;

            var node = new THREE.Mesh(
                    self.node_geometry,
                    new THREE.MeshLambertMaterial({
                        ambient: self.baseNodeColor,
                        color:self.baseNodeColor,
                        specular:0.75,
                        transparent: true,
                        opacity: 0.85,
                        shading: THREE.SmoothShading})
            );

            node.name = new_host;
            if (self.file_data[node.name.file_path] === undefined) {
                self.file_data[node.name.file_path] = {
                    'filename': node.name.filename,
                    'file_path': node.name.file_path,
                    'file_metadata_path': node.name.file_metadata_path,
                    'hosts': [node.name]
                };
            } else {
                self.file_data[node.name.file_path]['hosts'].push(node.name);
            }

            // var uuid = self.node_uuids.length;
            // node.id = uuid;
            // self.node_uuids.push(uuid);

            self.hosts_to_ids[new_host.mac] = node.id;
            self.nodes.add(node);
            self._nodes.push(node);
            var new_springy_node = self.graph.newNode({label: new_host.mac});
            self.macs_to_graphNodes[new_host.mac] = new_springy_node;
            self.octree.add(node);
        }

        var i = 0;
        var depth_max = 10;
        var depth_exponent = 2.0;
        var shift = 10.0;
        var delta_shift = 10.0;
        // var shift_exponent = 3.0;
        // self.nodes.traverse(function(node) {
        //     if ((node.name === undefined) || (node.name.ip === undefined)) return;
        //     if ($.inArray(node.name.ip, self.hosts) === -1) return;

        //     var num_nodes = self.nodes.children.length;
        //     var node_diameter = node.geometry.parameters.radius;
            
        //     if ((i !== 0) && (i % depth_max === 0)) {
        //         depth_max = depth_max*depth_exponent+1;
        //         shift = shift+delta_shift;
        //     }

        //     if (self.localhost !== undefined) {
        //         var local_id = self.hosts_to_ids[self.localhost];
        //         // depth_max = i < 6 ? 5 : depth_max;
        //         if (node.id === local_id) {
        //             node.position.z = 0;
        //             node.position.y = 0;
        //             node.position.x = 0;
        //         } else {
        //             node.position.x =   shift*
        //                                 node_diameter *
        //                                 Math.cos(i/(depth_max-1.0) * 4.0*Math.PI)

        //             node.position.z =   shift*
        //                                 node_diameter *
        //                                 Math.sin(i/(depth_max-1.0) * 4.0*Math.PI)
        //         }
        //     } else if (i > 0) {
        //         node.position.x =   shift*
        //                             node_diameter *
        //                             Math.cos(i/(depth_max-1.0) * 4.0*Math.PI)

        //         node.position.z =   shift*
        //                             node_diameter *
        //                             Math.sin(i/(depth_max-1.0) * 4.0*Math.PI)
        //     }
            
        //     i += 1;
        // });
        // i = 0;

        self.octree.update();

        // console.log("NODES:", self.nodes.children);    
    };

    self.add_edges = function(sessions) {
        var new_edges = [];
        for (var s = 0; s < sessions.length; s++) {
            var session = sessions[s];

            // console.log(session);

            var src = session.src;
            var source_ip = src.split(':')[0];
            var source_port = src.split(':')[1];
            var source_mac = session.src_mac;
            var source_name = session.src_name;
            var source = {
                ip: source_ip,
                port: source_port,
                mac: source_mac,
                name: source_name
            };

            var dst = session.dst;
            var destination_ip = dst.split(':')[0];
            var destination_port = dst.split(':')[1];
            var destination_mac = session.dst_mac;
            var destination_name = session.dst_name;
            var destination = {
                ip: destination_ip,
                port: destination_port,
                mac: destination_mac,
                name: destination_name
            };

            var hosts = self.hosts.slice();
            var edge_name = { 'filename': session.filename, 'src': source, 'dst': destination };
            if (($.inArray(source.mac, hosts) !== -1) && ($.inArray(destination.mac, hosts) !== -1) &&
                (self.edges_to_ids[source.mac+':'+destination.mac] === undefined)) {

                // console.log("SOURCE:", source);
                // console.log("DESTINATION:", destination);
                // console.log("HOSTS:", hosts);

                var edge = new THREE.Object3D();
                edge.add( new THREE.Mesh(
                        self.edge_geometry,
                        new THREE.MeshPhongMaterial({
                            color: self.baseEdgeColor,
                            ambient: self.baseEdgeColor})//,
                            // specular: 0xff1111})
                    ));
                edge.name = edge_name;
                self.edges.add(edge);
                self._edges.push(edge);
                var src_springy_node = self.macs_to_graphNodes[source.mac];
                var dst_springy_node = self.macs_to_graphNodes[destination.mac];
                self.graph.newEdge(src_springy_node, dst_springy_node);

                // self.octree.add(edge);
                var src_node = self.scene.getObjectById(self.hosts_to_ids[source.mac]);
                var dst_node = self.scene.getObjectById(self.hosts_to_ids[destination.mac]);    

                // if ((src_node === undefined) || (dst_node === undefined)) { return; }
                if (src_node !== undefined) {
                    if (src_node.transmit_edges === undefined) { src_node.transmit_edges = []; }                
                    src_node.transmit_edges.push(edge);    
                }
                

                if (dst_node !== undefined) {
                    if (dst_node.receive_edges === undefined) { dst_node.receive_edges = []; }
                    dst_node.receive_edges.push(edge);
                }

                // var uuid = self.edge_uuids.length;
                // edge.id = uuid;
                // self.edge_uuids.push(uuid);
                self.edges_to_ids[source.mac+':'+destination.mac] = edge.id;
            }
        }

        self.edges.traverse(function(edge) {
            if ((edge.name === undefined) || (edge.name.src === undefined)) return;

            var num_edges = self.edges.children.length;
            var edge_length = edge.children[0].geometry.parameters.height;

            source_node = self.scene.getObjectById(self.hosts_to_ids[edge.name.src.mac]);
            destination_node = self.scene.getObjectById(self.hosts_to_ids[edge.name.dst.mac]);

            // if ((source_node === undefined) || (destination_node === undefined)) { return; }

            if ((source_node === undefined) || (destination_node === undefined)) { return; }
            var midpoint = {
                x: (destination_node.position.x + source_node.position.x) / 2.0,
                y: (destination_node.position.y + source_node.position.y) / 2.0,
                z: (destination_node.position.z + source_node.position.z) / 2.0                
            };

            var distance =  destination_node.position.distanceTo(source_node.position);
            // source_node.add(edge);
            // edge.position.copy(destination_node.position);
            
            // edge.children[0[.rotation.y = Math.atan()
            edge.children[0].scale.y = distance/edge_length;

            edge.rotation.z = 90 * Math.PI/180;
            var dz = source_node.position.z - destination_node.position.z,
                dx = source_node.position.x - destination_node.position.x;
            if (((dx < 0) || (dz < 0)) || ((dz < 0) && (dx >= 0))) {
                edge.rotation.y = -Math.atan(dz / dx);
            // } else if ((dx >= 0) && (dz >= 0)) {
            //     edge.rotation.y = Math.atan(dz / dx);
            } else {
                edge.rotation.y = -Math.atan(dz / dx);                
            }

            edge.position.copy(midpoint);           
            // edge.position.z += midpoint.z;
            // edge.position.y += midpoint.y;
            // edge.position.x += midpoint.x;

        });

        // console.log("EDGES:", self.edges.children);    

    };

    self.register = function() {
        "use strict";
        return
        // document.oncontextmenu = function() {
        //     return false;
        // };

        // $(document).keydown(self.Controls.Keyboard.onKeyDown);
        // $(document).keyup(self.Controls.Keyboard.onKeyUp);
    };

    self.initEventHandling = function() {
        var _vector = new THREE.Vector3,
            handleMouseDown, handleMouseMove, handleMouseUp;
        
        var scene_container = document.getElementById( 'scene-container' );
        var header = document.getElementById( 'sp-header' );
        var render_dom = self.renderer.domElement;

        handleMouseDown = function( evt ) {
            var ray, intersections;
            
            _vector.set(
                ( evt.clientX / scene_container.scrollWidth ) * 2 - 1,
                -( (evt.clientY-header.offsetHeight) / scene_container.offsetHeight ) * 2 + 1,
                1
            );

            //projector.unproject( _vector, camera );
            _vector.unproject(self.camera);
            
            ray = new THREE.Raycaster( self.camera.position, _vector.sub( self.camera.position ).normalize() );
            intersections = ray.intersectObjects( self._nodes );

            var host_node = null;
            if ( intersections.length > 0 ) {
                host_node = intersections[0].object;

                var selection_message = {
                    type: 'host',
                    mac: host_node.name.mac,
                    ip: host_node.name.ip,
                    num_edges:  (host_node.transmit_edges !== undefined  ? host_node.transmit_edges.length
                                                                        : 0) +
                                (host_node.receive_edges !== undefined   ? host_node.receive_edges.length
                                                                        : 0) 
                };

                self.ui.update_selection_data(selection_message);
                console.log("DATA:", host_node.name);
                console.log("TRANSMIT:", host_node.transmit_edges);
                console.log("RECEIVE:", host_node.receive_edges);
                if (self.selected_node !== null) {
                    self.selected_node.material.ambient.setHex( self.baseNodeColor );
                    if (self.selected_node.name.mac === host_node.name.mac) {
                        self.selected_node = null;
                        self.fill_scene();                
                        return;
                    }
                }

                self.selected_node = host_node;
                self.localhost = host_node.name.mac;

                // $('#sqlvar').innerHTML = host_node.name.toString();
                // alert(host_node.name.toString());
                self.fill_scene();
            }
        };
        
        handleMouseMove = function( evt ) {
            
            //+ Retrieve mouse coordinates.
            var mouse = {};
            mouse.x = ( evt.clientX / scene_container.scrollWidth ) * 2 - 1;
            mouse.y = - ( (evt.clientY-header.offsetHeight) / scene_container.offsetHeight ) * 2 + 1;
            //- Retrive mouse coordinates.

            // Set the vector's (x,y) coordinates equal to the mouse, +1 z.
            _vector.set(mouse.x, mouse.y, 1.0);
            // Do the opposite of projection so that the vector becomes parallel to self.camera.
            _vector.unproject(self.camera);

            var raycaster = new THREE.Raycaster( self.camera.position, _vector.sub( self.camera.position ).normalize() ), 
                intersections,
                i, scalar;

            var octreeObjects;
            var numObjects;
            var numFaces = 0;

            octreeObjects = self.octree.search( raycaster.ray.origin, raycaster.ray.far, true, raycaster.ray.direction );
            
            intersections = raycaster.intersectOctreeObjects( octreeObjects );
            
            numObjects = octreeObjects.length;
            
            for ( var i = 0, il = numObjects; i < il; i++ ) {
                
                numFaces += octreeObjects[ i ].faces.length;
                
            }

            if ( intersections.length > 0 ) {
                var intersected_host_node = intersections[ intersections.length-1 ].object;
                if ( (self.intersected === null) || (self.intersected.name.mac !== intersected_host_node.name.mac )) {

                    if ( self.intersected ) self.intersected.material.ambient.setHex( self.baseNodeColor );

                    if (self.intersected !== null) {
                    
                        if ((self.intersected.transmit_edges !== undefined) || (self.intersected.receive_edges !== undefined)) {
                            self.edges.traverse(function(child) {
                                if (child.material === undefined) { return; }
                                
                                child.material.transparent = false;
                                child.material.opacity = 0.2;
                            });
                        }
                        if (self.intersected.transmit_edges !== undefined) {
                            // Edges where this node is the source.
                            for (var t = 0; t < self.intersected.transmit_edges.length; t++) {
                                var transmit_edge = self.intersected.transmit_edges[t];
                                transmit_edge.children[0].material.ambient.setHex( self.baseEdgeColor );
                                transmit_edge.children[0].material.opacity = 0.8;
                            }
                        }
                        if (self.intersected.receive_edges !== undefined) {
                            // Edges where this node is the destination.
                            for (var r = 0; r < self.intersected.receive_edges.length; r++) {
                                var receive_edge = self.intersected.receive_edges[r];
                                receive_edge.children[0].material.ambient.setHex( self.baseEdgeColor );
                                receive_edge.children[0].material.opacity = 0.8;
                            }
                        }
                    }
       
                     self.intersected = intersected_host_node;
                    var selection_message = {
                        type: 'host',
                        mac: intersected_host_node.name.mac,
                        ip: intersected_host_node.name.ip,
                        num_edges:  (intersected_host_node.transmit_edges !== undefined  ? intersected_host_node.transmit_edges.length
                                                                            : 0) +
                                    (intersected_host_node.receive_edges !== undefined   ? intersected_host_node.receive_edges.length
                                                                            : 0) 
                    };

                    self.ui.update_selection_data(selection_message);
                } else {
                    self.edges.traverse(function(child) {
                        if (child.material === undefined) { return; }

                        if (self.selected_node !== null) {
                            if ($.inArray(child, self.selected_node.receive_edges) !== -1) { return; }
                            if ($.inArray(child, self.selected_node.transmit_edges) !== -1) { return; }
                        }
                       
                        child.material.ambient.setHex( self.baseEdgeColor ); 
                        child.material.transparent = true;
                        child.material.opacity = 0.2;
                    });
                }

                document.body.style.cursor = 'crosshair';

            } else {
                if (self.intersected !== null) {
                    self.intersected.material.ambient.setHex( self.baseNodeColor );
                    if ((self.intersected.transmit_edges !== undefined) || (self.intersected.receive_edges !== undefined)) {
                        self.edges.traverse(function(child) {
                            if (child.material === undefined) { return; }

                            if (self.selected_node !== null) {
                                if ($.inArray(child, self.selected_node.receive_edges) !== -1) { return; }
                                if ($.inArray(child, self.selected_node.transmit_edges) !== -1) { return; }
                            }
                            
                            child.material.ambient.setHex( self.baseEdgeColor ); 
                            child.material.transparent = true;
                            child.material.opacity = 0.2;
                        });

                        if (self.intersected.transmit_edges !== undefined) {
                            // Edges where this node is the source.
                            for (var t = 0; t < self.intersected.transmit_edges.length; t++) {
                                var transmit_edge = self.intersected.transmit_edges[t];
                                transmit_edge.children[0].material.ambient.setHex( self.intersectEdgeColor );
                                transmit_edge.children[0].material.transparent = true;
                                transmit_edge.children[0].material.opacity = 0.2;
                            }
                        }
                        if (self.intersected.receive_edges !== undefined) {
                            // Edges where this node is the destination.
                            for (var r = 0; r < self.intersected.receive_edges.length; r++) {
                                var receive_edge = self.intersected.receive_edges[r];
                                receive_edge.children[0].material.ambient.setHex( self.intersectEdgeColor );
                                receive_edge.children[0].material.transparent = true;
                                receive_edge.children[0].material.opacity = 0.2;
                            }
                        }
                    }

                    var host_node = self.selected_node;
                    if (host_node === null) { return; }
                    var selection_message = {
                        type: 'host',
                        mac: host_node.name.mac,
                        ip: host_node.name.ip,
                        num_edges:  (host_node.transmit_edges !== undefined  ? host_node.transmit_edges.length
                                                                            : 0) +
                                    (host_node.receive_edges !== undefined   ? host_node.receive_edges.length
                                                                            : 0) 
                    };

                    self.ui.update_selection_data(selection_message);
                }

                self.intersected = null;

                document.body.style.cursor = 'auto';
            }      


            // update tracker
            
            // self.tracker.innerHTML = ( self.useOctree ? 'Octree search' : 'Search without octree' ) + ' using infinite ray from camera found [ ' + numObjects + ' / ' + self._nodes.length + ' ] nodes, [ ' + numFaces + ' / ' + self.totalFaces + ' ] faces, and [ ' + intersections.length + ' ] intersections.';
        };
        
        handleMouseUp = function( evt ) {
            
            // if ( self.selected_node !== null ) {
                // _vector.set( 1, 1, 1 );
                // self.selected_node.setAngularFactor( _vector );
                // self.selected_node.setLinearFactor( _vector );
                
                // self.selected_node = null;
            // }
            
        };

        onWindowResize = function() {
            self.camera.aspect = scene_container.offsetWidth / scene_container.offsetHeight;
            self.camera.updateProjectionMatrix();

            self.renderer.setSize( scene_container.offsetWidth, scene_container.offsetHeight );
        };
        
        self.renderer.domElement.addEventListener( 'mousedown', handleMouseDown );
        self.renderer.domElement.addEventListener( 'mousemove', handleMouseMove );
        self.renderer.domElement.addEventListener( 'mouseup', handleMouseUp );
        window.addEventListener( 'resize', onWindowResize, false );

    };

    self.update = function() {
        "use strict";
        requestAnimationFrame(self.update);
        // self.fill_scene();
        self.render();
    };

    self.render = function() {
        "use strict";
        // self.fill_scene();

        self.update_selection();
        var delta = self.clock.getDelta();
        self.controls.update( delta );
        self.renderer.render(self.scene, self.camera);
    };

    self.update_selection = function() {
      if (self.selected_node !== null) {
            self.selected_node.material.ambient.setHex( self.intersectNodeColor );

            if ((self.selected_node.transmit_edges !== undefined) || (self.selected_node.receive_edges !== undefined)) {
                self.edges.traverse(function(child) {
                    if (child.material === undefined) { return; }
                
                    child.material.ambient.setHex( self.baseEdgeColor );
                    child.material.transparent = true;
                    child.material.opacity = 0.2;
                });
            }

            if (self.selected_node.transmit_edges !== undefined) {
                // Edges where this node is the source.
                for (var t = 0; t < self.selected_node.transmit_edges.length; t++) {
                    var transmit_edge = self.selected_node.transmit_edges[t];
                    transmit_edge.children[0].material.ambient.setHex( self.transmitEdgeColor );
                    transmit_edge.children[0].material.opacity = 0.8;
                }
            }
            if (self.selected_node.receive_edges !== undefined) {
                // Edges where this node is the destination.
                for (var r = 0; r < self.selected_node.receive_edges.length; r++) {
                    var receive_edge = self.selected_node.receive_edges[r];
                    receive_edge.children[0].material.ambient.setHex( self.receiveEdgeColor );
                    receive_edge.children[0].material.opacity = 0.8;
                }
            }
        }
        
        if (self.intersected !== null) {
            self.intersected.material.ambient.setHex( self.intersectNodeColor );

            if ((self.intersected.transmit_edges !== undefined) || (self.intersected.receive_edges !== undefined)) {
                self.edges.traverse(function(child) {
                    if (child.material === undefined) { return; }

                    if (self.selected_node !== null) {
                        if ($.inArray(child, self.selected_node.receive_edges) !== -1) { return; }
                        if ($.inArray(child, self.selected_node.transmit_edges) !== -1) { return; }
                    }
                    
                    child.material.ambient.setHex( self.baseEdgeColor );
                    child.material.transparent = true;
                    child.material.opacity = 0.2;
                });
            }

            if (self.intersected.transmit_edges !== undefined) {
                // Edges where this node is the source.
                for (var t = 0; t < self.intersected.transmit_edges.length; t++) {
                    var transmit_edge = self.intersected.transmit_edges[t];
                    transmit_edge.children[0].material.ambient.setHex( self.intersectEdgeColor );
                    transmit_edge.children[0].material.opacity = 0.8;
                }
            }
            if (self.intersected.receive_edges !== undefined) {
                // Edges where this node is the destination.
                for (var r = 0; r < self.intersected.receive_edges.length; r++) {
                    var receive_edge = self.intersected.receive_edges[r];
                    receive_edge.children[0].material.ambient.setHex( self.intersectEdgeColor );
                    receive_edge.children[0].material.opacity = 0.8;
                }
            }
        }
    }

    self.generateUUID = function() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = (d + Math.random()*1000000)%1000000 | 0;
                d = Math.floor(d/1000000);
                return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });

        return uuid;
    };

    /*
    Calculates and sets global file information for serializaiton as metadata.
  */self.get_file_info = function(file_path) {
        console.log(self.file_data);
        console.log(file_path);
        var info = self.file_data[file_path];
        return info;
    };
};