/*
Evin Ozer
11/19/2014
*/

TAME.Message = {
    sessions: [],
    packets: [],
    sent: [],
    link_types: [],
    shosts: [],
    dhosts: [],

    edges: [],

	/* initialize_connection
    Listens for and allows emission of traffic on the specified host:port.
  */initialize_connection: function(){
        TAME.remote_socket = io(TAME.remote_zmq_host);
        TAME.remote_socket.on('connected', TAME.Message.connected);
        TAME.remote_socket.on('start_session', TAME.Message.start_session);
        TAME.remote_socket.on('end_session', TAME.Message.end_session);
        TAME.remote_socket.on('on_packet', TAME.Message.receive_packet);
    },

    /* send_message
    Sends information about the current workflow to the remote host.
  */send_message: function(message_to_remote){
        TAME.remote_socket.emit('ui_toRemote', JSON.stringify(message_to_remote));
    },

	/* connected
    Message received on connection to server.
  */connected: function(message){
        console.log(message);
    },

    /* start_session
    Message received on start of TCP/UDP session.
  */start_session: function(session){
        // if (TAME.Message.sessions.length < 10) {
            if (session['src_mac'] !== undefined) {
                // console.log("BEGIN SESSION:", session);
                TAME.Message.sessions.push(session);
                // return;
                // console.log(session.src);
                // console.log("START SESSION:", session);
                // TAME.Message.sessions.push(session);

                TAME.fill_scene();
            }
        // }
    },

    /* end_session
    Message received on end of TCP/UDP session.
  */end_session: function(session){
        // if (TAME.Message.sessions.length < 10) {
           	if (session['src_mac'] !== undefined) {
                // console.log("END SESSION:", session);
                TAME.Message.sessions.pop(session);
                // return;
                // console.log(session.src);
                // console.log("END SESSION:", session);

                TAME.fill_scene();
            }
        // }
    },

    /* receive_packet
    Message received on every packet encountered.
  */receive_packet: function(packet){
        // if (TAME.Message.packets.length < 10) {
            if (packet.link_type !== undefined) {
                // console.log("PACKET:", packet);
                TAME.Message.packets.push(packet);
                // return;
                var link = TAME.Message.parse_linkType(packet);
                var hosts = TAME.Message.parse_hosts(packet);
                // console.log("SOURCE:", TAME.Message.shosts);
                // console.log("DESTINATION:", TAME.Message.dhosts);//hosts['dst']);                
                // console.log(TAME.Message.packet_index);
            }
        // } 
    },

    /* receive_message_from_remote
    Recieves packet information from a remote sniffer.
  */receive_message_from_remote: function(message_from_remote){
        
    },

	parse_linkType: function(message) {
		//+ LINK TYPE
        var link_type = message.link_type;
        var is_known_link = false;
        for (var i = 0; i < TAME.Message.link_types.length; i++) {
            var known_type = TAME.Message.link_types[i];
            if (link_type === known_type) {
                is_known_link = true;
            }
        }

        if (!is_known_link) {
            TAME.Message.link_types.push(link_type);
            // console.log(link_type);
        }
        //- LINK TYPE

        return link_type;
	},

	parse_hosts: function(message) {
		//+ HOSTS
        //+ SOURCE HOST
        var shost = {
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
        var dhost = {
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

        //+ Used in introspection of source and destination traffic.
        var is_known_ip = false;
        var is_known_port = false;
        var fill = false;
        //- Used in introspection of source and destination traffic.
        for (var i = 0; i < TAME.Message.shosts.length; i++) {
            var known_shost = TAME.Message.shosts[i];
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
            TAME.Message.shosts.push(shost);
            fill = true;
            // console.log(shost);
        }
        //- SOURCE HOST

        //+ DESTINATION HOST
        /* This code is redundant and should be abstracted. */
        for (var i = 0; i < TAME.Message.dhosts.length; i++) {
            var known_dhost = TAME.Message.dhosts[i];
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
            TAME.Message.dhosts.push(dhost);
            fill = true;
            // console.log(dhost);
        }
        //- DESTINATION HOST

        if (fill) {
            if (TAME.i === undefined) TAME.i = 0;
            console.log(TAME.i);
            TAME.fill_scene();
            TAME.i++;
        }

        // var hosts = ;
        // var new_hosts = [];
        // for (var s = 0; s < shosts.length; s++) {
        //     var shost = shosts[s];
        //     // console.log("SHOST:", shost);
        //     // console.log("HOSTS:", hosts);
           
        //     if ($.inArray(shost.ip, hosts) === -1) {
        //         TAME.hosts.push(shost.ip);
        //         new_hosts.push(shost);
        //     }
        // } for (var d = 0; d < dhosts.length; d++) {
        //     var dhost = dhosts[d];
        //     // console.log("DHOST:", dhost);
        //     // console.log("HOSTS:", hosts);
            
        //     if ($.inArray(dhost.ip, hosts) === -1) {
        //         TAME.hosts.push(dhost.ip);
        //         new_hosts.push(dhost);
        //     }
        // }
        //- HOSTS
        
        return { 'src': shost, 'dest': dhost};
	}
}