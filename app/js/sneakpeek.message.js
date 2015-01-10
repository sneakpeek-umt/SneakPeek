/*
Evin Ozer
11/19/2014
*/

SneakPeek.Messager = function(configuration) {
    var self = this;

    self.remote_zmq_host = configuration['remote_zmq_host'];
    self.__peek = configuration['peek'];
    self.__update_file_list = configuration['update_file_list'];
    self.__update_settings = configuration['update_settings'];
    self.__display_metadata = configuration['display_metadata'];
    self.__get_file_info = configuration['get_file_info'];
    self.sessions = [];
    self.packets = [];
    self.sent = [];
    self.link_types = [];
    self.shosts = [];
    self.dhosts = [];

    self.edges = [];

	/* initialize_connection
    Listens for and allows emission of traffic on the specified host:port.
  */self.initialize_connection = function(){
        self.remote_socket = io(self.remote_zmq_host);
        self.remote_socket.on('connected', self.connected);
        self.remote_socket.on('start_session', self.start_session);
        self.remote_socket.on('end_session', self.end_session);
        self.remote_socket.on('on_packet', self.receive_packet);
        self.remote_socket.on('on_pcap_file_packet', self.receive_pcap_file_packet);
        self.remote_socket.on('list_files', self.list_files);
        self.remote_socket.on('request_metadata_update', self.request_metadata_update);
        self.remote_socket.on('display_metadata', self.show_metadata);
    };

    /* send_message
    Sends information about the current workflow to the remote host.
  */self.send_message = function(message_to_remote, msg_type) {
        self.remote_socket.emit(msg_type !== undefined ? msg_type : 'ui_toRemote', JSON.stringify(message_to_remote));
    };

	/* connected
    Message received on connection to server.
  */self.connected = function(message) {
        console.log(message);

        // self.__update_settings({
        //     live_capture: message.is_live_capture
        // });
        // self.remote_socket.emit('ui_toRemote', 'Hi Blair!');
    };

    self.toggle_live_capture = function(checked) {
        var now = new Date().toISOString();
        var message = {
            timestamp: now,
            source: "SneakPeek",
            destination: "Distiller",
            payload: {
                command: "toggle_live_capture",
                filename: "live_"+now,
                checked: checked
            } 
        };

        self.send_message(message, 'toggle_live_capture');
    };


    /* start_session
    Message received on start of TCP/UDP session.
  */self.start_session = function(session) {
        // if (self.Message.sessions.length < 10) {
            if (session['src_mac'] !== undefined) {
                // console.log("BEGIN SESSION:", session);
                self.sessions.push(session);
                // return;
                // console.log(session.src);
                // console.log("START SESSION:", session);
                // self.Message.sessions.push(session);

                self.__peek();
            }
        // }
    };

    /* end_session
    Message received on end of TCP/UDP session.
  */self.end_session = function(session) {
       	if (session['src_mac'] !== undefined) {
            // console.log("END SESSION:", session);
            // self.sessions.pop(session);
            // return;
            // console.log(session.src);
            // console.log("END SESSION:", session);

            self.__peek();
        }
    };

    self.list_files = function(data) {
        console.log(data);
        self.__update_file_list(data);
    }

    /* receive_packet
    Message received on every packet encountered.
  */self.receive_packet = function(packet) {
        if (packet.link_type !== undefined) {
            // console.log("PACKET:", packet);
            self.packets.push(packet);
            // return;
            var link = self.parse_linkType(packet);
            var hosts = self.parse_hosts(packet);
            // console.log("SOURCE:", self.Message.shosts);
            // console.log("DESTINATION:", self.Message.dhosts);//hosts['dst']);                
            // console.log(self.Message.packet_index);
        }
    };

    /* receive_pcap_file_packet
    Message received on every packet encountered; that was contained in a pcap file.
  */self.receive_pcap_file_packet = function(packet) {
        if (self.pcap_file_packets === undefined) { self.pcap_file_packets = []; }

        // if (self.pcap_file_packets.length < 100) {
        //     self.pcap_file_packets.push(packet);
        //     console.log(packet);
        // }

        self.parse_hosts(packet['payload'], true);
        // if (packet.link_type !== undefined) {
        //     // console.log("PACKET:", packet);
        //     self.packets.push(packet);
        //     // return;
        //     var link = self.parse_linkType(packet);
        //     var hosts = self.parse_hosts(packet);
        //     // console.log("SOURCE:", self.Message.shosts);
        //     // console.log("DESTINATION:", self.Message.dhosts);//hosts['dst']);                
        //     // console.log(self.Message.packet_index);
        // }
    };

    /* receive_message_from_remote
    Recieves packet information from a remote sniffer.
  */self.receive_message_from_remote = function(message_from_remote) {
        
    };

    self.request_pcap_file_table_update = function() {
        self.send_message({}, 'list_files');
    };


	self.parse_linkType = function(message) {
		//+ LINK TYPE
        var link_type = message.link_type;
        var is_known_link = false;
        for (var i = 0; i < self.link_types.length; i++) {
            var known_type = self.link_types[i];
            if (link_type === known_type) {
                is_known_link = true;
            }
        }

        if (!is_known_link) {
            self.link_types.push(link_type);
            // console.log(link_type);
        }
        //- LINK TYPE

        return link_type;
	};

	self.parse_hosts = function(message, is_from_pcap_file) {
		//+ HOSTS
        //+ SOURCE HOST
        
        var shost = {};
        var dhost = {};
        if (is_from_pcap_file) {
            shost = {
                'filename': message.filename !== undefined ? message.filename : '',
                'file_path': message.file_path !== undefined ? message.file_path : '',
                'file_metadata_path': message.file_metadata_path !== undefined ? message.file_metadata_path : '',
                mac: message.shost.source_mac !== undefined ? message.shost.source_mac : null,
                ip: message.shost.source_ip !== undefined ? message.shost.source_ip : null,
                ports: {
                    tcp: message.protocol_type === 'TCP' ?
                            (message.shost.source_port !== undefined ? [message.shost.source_port] : [])
                            : [],
                    udp: message.protocol_type === 'UDP' ?
                            (message.shost.source_port !== undefined ? [message.shost.source_port] : [])
                            : []
                }
            };
            dhost = {
                'filename': message.filename !== undefined ? message.filename : '',
                'file_path': message.file_path !== undefined ? message.file_path : '',
                'file_metadata_path': message.file_metadata_path !== undefined ? message.file_metadata_path : '',
                mac: message.dhost.destination_mac !== undefined ? message.dhost.destination_mac : null,
                ip: message.dhost.destination_ip !== undefined ? message.dhost.destination_ip : null,
                ports: {
                    tcp: message.protocol_type === 'TCP' ?
                            (message.dhost.destination_port !== undefined ? [message.dhost.destination_port] : [])
                            : [],
                    udp: message.protocol_type === 'UDP' ?
                            (message.dhost.destination_port !== undefined ? [message.dhost.destination_port] : [])
                            : []
                }
            };
        } else {
            shost = {
                'filename': message.filename !== undefined ? message.filename : '',
                'file_path': message.file_path !== undefined ? message.file_path : '',
                'file_metadata_path': message.file_metadata_path !== undefined ? message.file_metadata_path : '',
                mac: message.link.shost !== undefined ? message.link.shost : null,
                ip: message.link.ip !== undefined ? message.link.ip.saddr : null,
                ports: {
                    tcp: message.link.ip !== undefined ?
                            (message.link.ip.tcp !== undefined ? [message.link.ip.tcp.sport] : [])
                            : [],
                    udp: message.link.ip !== undefined ?
                            (message.link.ip.udp !== undefined ? [message.link.ip.udp.sport] : [])
                            : []
                }
            };
            dhost = {
                'filename': message.filename !== undefined ? message.filename : '',
                'file_path': message.file_path !== undefined ? message.file_path : '',
                'file_metadata_path': message.file_metadata_path !== undefined ? message.file_metadata_path : '',
                mac: message.link.dhost !== undefined ? message.link.dhost : null,
                ip: message.link.ip !== undefined ? message.link.ip.daddr : null,
                ports: {
                    tcp: message.link.ip !== undefined ?
                            (message.link.ip.tcp !== undefined ? [message.link.ip.tcp.dport] : [])
                            : [],
                    udp: message.link.ip !== undefined ?
                            (message.link.ip.udp !== undefined ? [message.link.ip.udp.dport] : [])
                            : []
                }
            };
        }

        //+ Used in introspection of source and destination traffic.
        var is_known_ip = false;
        var is_known_port = false;
        var fill = false;
        //- Used in introspection of source and destination traffic.
        for (var i = 0; i < self.shosts.length; i++) {
            var known_shost = self.shosts[i];
            if (shost.ip === known_shost.ip) {
                is_known_ip = !((known_shost.ip === undefined) || (known_shost.ip === undefined)) ? true : false ;

     //            if (shost.ports.tcp !== undefined) {
					// for (var p = 0; p < known_shost.ports.tcp.length; p++) {
	    //                 var known_sport = known_shost.ports.tcp[p];
	    //                 if (shost.ports.tcp[0] === known_sport) {
	    //                     is_known_port = true;
	    //                 } else {
	    //                 	known_shost.ports.tcp.push(shost.ports.tcp[0]);
	    //                 }
	    //         	}
     //            } else if (shost.ports.udp !== undefined) {
					// for (var p = 0; p < known_shost.ports.udp.length; p++) {
	    //                 var known_sport = known_shost.ports.udp[p];
	    //                 if (shost.ports.udp[0] === known_sport) {
	    //                     is_known_port = true;
	    //                 } else {
	    //                 	known_shost.ports.udp.push(shost.ports.udp[0]);
	    //                 }
	    //         	}
     //            }
            }
        }

        if (!(is_known_ip)) {
            self.shosts.push(shost);
            fill = true;
            // console.log(shost);
        }
        //- SOURCE HOST

        //+ DESTINATION HOST
        /* This code is redundant and should be abstracted. */
        for (var i = 0; i < self.dhosts.length; i++) {
            var known_dhost = self.dhosts[i];
            if (dhost.ip === known_dhost.ip) {
                is_known_ip = !((dhost.ip === undefined) || (known_dhost.ip === undefined)) ? true : false ;

     //            if (dhost.ports.tcp !== undefined) {
	    //         	for (var p = 0; p < known_dhost.ports.length; p++) {
	    //                 var known_dport = known_dhost.ports.tcp[p];
	    //                 if (dhost.ports.tcp[0] === known_dport) {
	    //                     is_known_port = true;
	    //                 } else {
	    //                 	known_dhost.ports.tcp.push(dhost.ports.tcp[0]);
	    //                 }
	    //         	}
	    //         } else if (dhost.ports.udp !== undefined) {
					// for (var p = 0; p < known_shost.ports.length; p++) {
	    //                 var known_sport = known_dhost.ports.udp[p];
	    //                 if (dhost.ports.udp[0] === known_sport) {
	    //                     is_known_port = true;
	    //                 } else {
	    //                 	known_dhost.ports.udp.push(dhost.ports.udp[0]);
	    //                 }
	    //         	}
     //            }
            }
        }

        if (!(is_known_ip)) {
            self.dhosts.push(dhost);
            fill = true;
            // console.log(dhost);
        }
        //- DESTINATION HOST

        if (fill) {
            if (self.i === undefined) self.i = 0;
            // console.log('# Src', self.shosts.length);
            // console.log('# Dst:', self.dhosts.length);
            self.sessions.push({
                'filename': message.filename !== undefined ? message.filename : '',
                'file_path': message.file_path !== undefined ? message.file_path : '',
                'file_metadata_path': message.file_metadata_path !== undefined ? message.file_metadata_path : '',
                'src': shost.ip+':'+ (shost.ports.tcp.length > 0    ? shost.ports.tcp[0]
                                                                        : (shost.ports.udp.length > 0
                                                                    ? shost.ports.udp[0]
                                                                    : '0')),
                'src_mac': shost.mac,
                'src_name': '',
                'dst': dhost.ip+':'+ (dhost.ports.tcp.length > 0    ? dhost.ports.tcp[0]
                                                                        : (dhost.ports.udp.length > 0
                                                                    ? dhost.ports.udp[0]
                                                                    : '0')),
                'dst_mac': dhost.mac,
                'dst_name': ''
            });

            self.__peek();
            self.i++;
        }

        // var hosts = ;
        // var new_hosts = [];
        // for (var s = 0; s < shosts.length; s++) {
        //     var shost = shosts[s];
        //     // console.log("SHOST:", shost);
        //     // console.log("HOSTS:", hosts);
           
        //     if ($.inArray(shost.ip, hosts) === -1) {
        //         self.hosts.push(shost.ip);
        //         new_hosts.push(shost);
        //     }
        // } for (var d = 0; d < dhosts.length; d++) {
        //     var dhost = dhosts[d];
        //     // console.log("DHOST:", dhost);
        //     // console.log("HOSTS:", hosts);
            
        //     if ($.inArray(dhost.ip, hosts) === -1) {
        //         self.hosts.push(dhost.ip);
        //         new_hosts.push(dhost);
        //     }
        // }
        //- HOSTS
        
        return { 'src': shost, 'dest': dhost};
	};

    self.request_metadata_update = function(message) {
        var info = self.__get_file_info(message['payload']['file_path']);
        if (info === undefined) { return; }
        var now = new Date().toISOString();
        var message = {
            timestamp: now,
            source: "SneakPeek",
            destination: "Distiller",
            payload: {
                command: "request_metadata_update",
                filename: info['filename'],
                file_path: info['file_path'],
                file_metadata_path: info['file_metadata_path'],
                update: {
                    num_hosts: info['hosts'].length.toString()
                }
            }
        };

        self.send_message(message);
    };

    self.show_metadata = function(message) {
        var data = message['payload'];
        self.__display_metadata(data);
    };
};