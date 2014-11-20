/*
Evin Ozer
11/19/2014
*/

var TAME = {
    //+ Socket IO / ZMQ
    remote_zmq_host: 'localhost:38175',
    //- Socket IO / ZMQ

    //+ THREE.JS
    debug: false,
    stop: false,

    renderer: null,
    scene: null,
    camera: null,
    headlight: null,
    controls: null,
    clock: new THREE.Clock(),
    //- THREE.JS

    //+ GUI
    effectController: null,
    //- GUI
  
    //+ STATE
    localhost: '192.168.1.12',
    hosts: [],
    hosts_to_ids: {},
    shosts: [],
    dhosts: [],

    sessions: [],
    edges_to_ids: {},
    //- STATE

    //+ Schema (Nodes)
    nodes: new THREE.Object3D(),
    node_geometry: new THREE.SphereGeometry(10, 10, 12, 12),
    node_material: new THREE.MeshPhongMaterial({color:0x0000ff, specular:0x1111ff}),
    //- Schema (Nodes)
    
    //+ Schema (Edges)
    edges: new THREE.Object3D(),
    edge_geometry: new THREE.BoxGeometry(5, 5, 5),
    edge_material: new THREE.MeshPhongMaterial({color:0xff0000, specular:0xff1111}),
    //- Schema (Nodes)

    /* objectify
        Constructs an object from an array.
  */objectify: function(obj, val, index) {
        obj[index] = val;
        return obj;
    },

    init: function(do_) {
        "use strict";
        
        // return;
        /* Create the frustum of a perspective camera.
         *   fov     -   75          Vertical field of view = 75 degrees
         *   aspect  -   (iw / ih)   Aspect ratio.
         *   near    -   0.1         Near plane.
         *   far     -   1000        Far plane.
         */
        TAME.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 80000 );
        TAME.camera.position.z = 1200;

        // Initialize the graphical back-end that will render the scene.
        TAME.renderer = new THREE.WebGLRenderer( { antialias: true, maxLights: 100 } );
        
        // Set the size of the renderer to match the inner width and inner height of the window.
        TAME.renderer.setSize(window.innerWidth, window.innerHeight);
        TAME.renderer.setClearColor( 0x111111, 1.0 );
        document.body.appendChild(TAME.renderer.domElement);

        TAME.renderer.gammaInput = true;
        TAME.renderer.gammaOutput = true;
        TAME.renderer.shadowMapEnabled = true;

        window.addEventListener( 'resize', TAME.onWindowResize, false );

        TAME.controls = new THREE.TrackballControls(TAME.camera, TAME.renderer.domElement);


         // Create a scene where objects, cameras, and lights can be placed.
        TAME.scene = new THREE.Scene();
        // TAME.scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );
        // Set lights in scene.    
        TAME.addLights(TAME.scene);

        TAME.setupGui();
        TAME.Message.initialize_connection();

        TAME.nodes.name = "Nodes";
        TAME.scene.add(TAME.nodes);

        TAME.edges.name = "Edges";
        TAME.scene.add(TAME.edges);

        /* Begin the application. */
        TAME.update();
    },

	setupGui: function() {

        TAME.effectController = {

        };

        var h;

        var gui = new dat.GUI();

        // material (attributes)

        h = gui.addFolder( "Material control" );

        // h.add( TAME.effectController, "shininess", 1.0, 400.0, 1.0 ).name("m_shininess");
    },

    addLights: function() {
        // Add lights here
        TAME.lights = {};

        if (TAME.lights.ambient === undefined) {
            var ambient = new THREE.AmbientLight( 0x222222 );

            TAME.lights.ambient = ambient;
            TAME.scene.add(ambient);
        }

        if (TAME.lights.directional === undefined) {
            TAME.lights.directionals = {}

            var num_directionals = 4;
            TAME.lights.directionals = [];
            for (var i = 0; i < num_directionals; i++) {
                var directional = new THREE.DirectionalLight( 0xFFFFFF, 1.0 );
                // directional.rotation.set( -90*Math.cos(i), 0, 0 );
                directional.position.set( 10*Math.cos(i), 10*Math.cos(i), 10*Math.sin(i) );

                TAME.scene.add(directional);
                TAME.lights.directionals.push(directional);
            }
        }

        if (TAME.lights.spots === undefined) {
            /*
                SpotLight(hex, intensity, distance, angle, exponent)

                    hex — Numeric value of the RGB component of the color. 
                    intensity — Numeric value of the light's strength/intensity. 
                    distance -- todo 
                    angle -- todo 
                    exponent -- todo

            */
            var num_spots = 0;
            TAME.lights.spots = [];
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
                
                TAME.scene.add(spot);
                TAME.lights.spots.push(spot);
            }
        }

        if (TAME.lights.points === undefined) {
            /*
                PointLight(hex, intensity, distance)

                    hex — Numeric value of the RGB component of the color. 
                    intensity — Numeric value of the light's strength/intensity. 
                    distance -- The distance of the light where the intensity is 0. When distance is 0, then the distance is endless.
                    Creates a light at a specific position in the scene. The light shines in all directions (roughly similar to a light bulb.)

            */
            var num_points = 0;
            var colors = TAME.Utility.generate_random_values(4, num_points, true);
            TAME.lights.points = [];
            
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
                
                TAME.scene.add(point);
                TAME.lights.points.push(point);
            }
        }
    },

    fill_scene: function() {
        // var old_sources = TAME.shosts,
        var new_sources = TAME.Message.shosts,
            // old_destinations = TAME.dhosts,
            new_destinations = TAME.Message.dhosts,
            // old_sessions = TAME.sessions,
            new_sessions = TAME.Message.sessions;

        // TAME.sources_changed = old_sources.length < new_sources.length;
        // TAME.destinations_changed = old_destinations.length < new_destinations.length;
        // TAME.sessions_changed = old_sessions.length < new_sessions.length;
        // if (TAME.sources_changed || TAME.destinations_changed || TAME.sessions_changed) {
            // TAME.shosts = new_sources.slice();
            // TAME.dhosts = new_destinations.slice();
        TAME.generate_network(new_sources, new_destinations, new_sessions);
        // }

        return;
    },

    generate_network: function(shosts, dhosts, sessions) {
        TAME.sources_changed = false;
        TAME.destinations_changed = false;
        // return;
        console.log("Generating Network");
        
        TAME.add_nodes(shosts, dhosts);

        TAME.sessions = sessions;
        TAME.add_edges(sessions);
    },

    add_edges: function(sessions) {
        var new_edges = [];
        for (var s = 0; s < sessions.length; s++) {
            var session = sessions[s];

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

            var hosts = TAME.hosts.slice();
            var edge_name = { 'src': source, 'dst': destination };
            if (($.inArray(source.ip, hosts) !== -1) && ($.inArray(destination.ip, hosts) !== -1) &&
                (TAME.edges_to_ids[source.ip+':'+destination.ip] === undefined)) {

                if (TAME.edge === undefined) {
                    TAME.edge = new THREE.Object3D();
                    TAME.edge.add( new THREE.Mesh(
                        TAME.edge_geometry,
                        TAME.edge_material
                    ));
                }

                // console.log("SOURCE:", source);
                // console.log("DESTINATION:", destination);
                // console.log("HOSTS:", hosts);

                var edge = TAME.edge.clone();
                edge.name = edge_name;
                TAME.edges.add(edge);
                TAME.edges_to_ids[source.ip+':'+destination.ip] = edge.id;
            }
        }

        TAME.edges.traverse(function(edge) {
            if ((edge.name === undefined) || (edge.name.src === undefined)) return;

            var num_edges = TAME.edges.children.length;
            var edge_length = edge.children[0].geometry.parameters.height;

            source_node = TAME.scene.getObjectById(TAME.hosts_to_ids[edge.name.src.ip]);
            destination_node = TAME.scene.getObjectById(TAME.hosts_to_ids[edge.name.dst.ip]);

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

        // console.log("EDGES:", TAME.edges.children);    

    },

    add_nodes: function(shosts, dhosts) {
        var hosts = TAME.hosts.slice();
        var new_hosts = [];
        for (var s = 0; s < shosts.length; s++) {
            var shost = shosts[s];
            // console.log("SHOST:", shost);
            // console.log("HOSTS:", hosts);
           
            if ($.inArray(shost.ip, hosts) === -1) {
                TAME.hosts.push(shost.ip);
                new_hosts.push(shost);
            } else {
                var src_id = TAME.hosts_to_ids[shost.ip];
                var src_node = TAME.scene.getObjectById(src_id);
                src_node.scale.z += 0.1;
                src_node.scale.y += 0.1;
                src_node.scale.x += 0.1;

                src_node.geometry.computeFaceNormals();
            }
        } for (var d = 0; d < dhosts.length; d++) {
            var dhost = dhosts[d];
            // console.log("DHOST:", dhost);
            // console.log("HOSTS:", hosts);
            
            if ($.inArray(dhost.ip, hosts) === -1) {
                TAME.hosts.push(dhost.ip);
                new_hosts.push(dhost);
            } else {
                var dst_id = TAME.hosts_to_ids[dhost.ip];
                var dst_node = TAME.scene.getObjectById(dst_id);
                dst_node.scale.z += 0.1;
                dst_node.scale.y += 0.1;
                dst_node.scale.x += 0.1;

                dst_node.geometry.computeFaceNormals();
            }
        }

        // console.log("SHOSTS:", shosts.length);
        // console.log("DHOSTS:", dhosts.length);
        for (var n = 0; n < new_hosts.length; n++) {
            var new_host = new_hosts[n];

            if (TAME.node === undefined) {
                TAME.node = new THREE.Mesh(
                    TAME.node_geometry,
                    TAME.node_material
                );

            }

            var node = TAME.node.clone();
            node.name = new_host;
            TAME.hosts_to_ids[new_host.ip] = node.id;
            TAME.nodes.add(node);
        }

        var i = 0;
        TAME.nodes.traverse(function(node) {
            if (i < 10) {
                // console.log("NODE:", node);
            }

            if ((node.name === undefined) || (node.name.ip === undefined)) return;
            if ($.inArray(node.name.ip, TAME.hosts) === -1) return;

            var num_nodes = TAME.nodes.children.length;
            var node_diameter = node.geometry.parameters.radius;

            if (TAME.localhost !== undefined) {
                var local_id = TAME.hosts_to_ids[TAME.localhost];
                if (node.id === local_id) {
                    node.position.z = 0;
                    node.position.y = 0;
                    node.position.x = 0;
                } else {
                    node.position.x =   4*num_nodes *
                                        node_diameter *
                                        Math.cos(i/(num_nodes-1) * 2*Math.PI);

                    node.position.z =   4*num_nodes *
                                        node_diameter *
                                        Math.sin(i/(num_nodes-1) * 2*Math.PI);
                }
            } else if (i > 0) {
                node.position.x =   4*num_nodes *
                                    node_diameter *
                                    Math.cos(i/(num_nodes-1) * 2*Math.PI);

                node.position.z =   4*num_nodes *
                                    node_diameter *
                                    Math.sin(i/(num_nodes-1) * 2*Math.PI);
            }
            
            i++;
        });
        i = 0;

        // console.log("NODES:", TAME.nodes.children);    
    },

    register: function() {
        "use strict";
        return
        // document.oncontextmenu = function() {
        //     return false;
        // };

        // $(document).keydown(TAME.Controls.Keyboard.onKeyDown);
        // $(document).keyup(TAME.Controls.Keyboard.onKeyUp);
    },

    update: function() {
        "use strict";
        requestAnimationFrame(TAME.update);
        // TAME.fill_scene();
        TAME.render();
    },

    render: function() {
        "use strict";
        var delta = TAME.clock.getDelta();
        TAME.controls.update( delta );
        // TAME.fill_scene();

        TAME.renderer.render(TAME.scene, TAME.camera);
    }
};