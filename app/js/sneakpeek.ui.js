SneakPeek.UI = function(configuration) {
    var self = this;
    self.peek = configuration['peek'];
    self.parse_file_pcap = configuration['parse_file_pcap'];
    self.clear_cache = configuration['clear_cache'];

    self.selects = {
        files: []
    };

    self.initialize = function() {
        $( ".selectable_pcap_file" ).selectable({
            stop: self.on_select_pcap_file
            // unselected: self.on_unselect_pcap_file
        });

        $('#live_capture_checkbox').change(self.__toggle_live_capture);
        // $('#sp-header').mouseenter(function() {
        //     self.controls.pause();
        // }).mouseleave(function() {
        //     $( this ).find( "span" ).text( "mouse leave" );
        // });
    };

    self.__toggle_live_capture = function(evt) {
        var checked = $('#live_capture_checkbox').is(":checked");
        self.toggle_live_capture(checked);

        if (checked) {
            self.clear_cache();
            self.peek();
        }
    };

    self.update_settings = function(configuration) {
        $('#live_capture_checkbox').value = configuration['live_capture'];
    };

    self.update_pcap_table = function(pcap_files) {
        //if/for till end 
        var table = document.getElementById('pcap_file_table_body');

        var old_data = {};
        while(table.rows.length > 0) {
            var filename = $(table.rows[0].cells[0]).text();
            old_data[filename] = {
                'lastModified': $(table.rows[0].cells[1]).text(),
                'size': $(table.rows[0].cells[2]).text(),
                'num_hosts': $(table.rows[0].cells[3]).text(),
            };
             
            table.deleteRow(0);
        }

        var i = 0;
        for (var key in pcap_files) {
            var row = table.insertRow(i);
            var name_cell = row.insertCell(0);
            name_cell.innerHTML = pcap_files[key].name;
            var date_cell = row.insertCell(1);
            date_cell.innerHTML = '';//pcap_files[key].ctime;
            var size_cell = row.insertCell(2);
            size_cell.innerHTML = '';//pcap_files[key].size.toString();
            var num_hosts_cell = row.insertCell(3);
            num_hosts_cell.style.textAlign = "center";
            
            if (old_data[pcap_files[key].name] !== undefined) {
                date_cell.innerHTML = old_data[pcap_files[key].name]['lastModified'];
                size_cell.innerHTML = old_data[pcap_files[key].name]['size'];
                num_hosts_cell.innerHTML = old_data[pcap_files[key].name]['num_hosts'];
            }

            i++;
        }

        $( ".selectable_pcap_file" ).selectable("refresh");
    };

    self.update_pcap_file_data = function(pcap_file_data) {
        console.log("UPDATING PCAP_FILE_DATA", pcap_file_data);
        var table = document.getElementById('pcap_file_table_body');
        var rows = table.getElementsByTagName("tr");

        // $('#pcap_file_table_body').children('tr').each(function() {

        //     // where 'x' is the index of the <td> to target
        //     var $requiredCell = $(this).children('td').eq(pcap_file_data['filename']);

        //     console.log($requiredCell);
        //     // doStuff( $requiredCell );

        // });

        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var filename = $(row.cells[0]).text();
            console.log(filename);
            console.log(pcap_file_data);
            if (filename === pcap_file_data['filename']) {
                $(row.cells[1]).text(pcap_file_data['metadata']['modified_datetime']);
                $(row.cells[2]).text((pcap_file_data['metadata']['size'] / 1000000.0).toFixed(2).toString());
                $(row.cells[3]).text(pcap_file_data['metadata']['num_hosts']);
            }
        }

        $( ".selectable_pcap_file" ).selectable("refresh");
    };

    self.update_selection_data = function(selection_data) {
        if (selection_data['type'] === 'host') {
            var host_data = selection_data;
            var labela = $('#mac_address');
            var labelb = $('#ip_address');
            var labelc = $('#num_connections');
            console.log(host_data);
            labela.text(host_data.mac);
            labelb.text(host_data.ip);
            labelc.text(host_data.num_edges.toString());
        }
    };

    self.update_settings = function(admin_settings) {
        admin_settings = JSON.parse(admin_settings);
        var checkboxval = $('#live_capture_checkbox');
        checkboxval.value = admin_settings.is_live_capture;
    };

    self.on_select_pcap_file = function( ) {
        console.log('hi');
        // console.log("EVENT:", event);
        // console.log("UI:", ui);

        // if (ui === undefined) { return; }
        // if (ui.selected === undefined) { return; }
        // if (ui.selected.cells === undefined) { return; }
        // var selected_pcap_file = $(ui.selected.cells[0]).text();
        self.clear_cache();
        
        $( ".ui-selected" ).each(function() {
            var index = $( ".selectable_pcap_file tr" ).index( this );

            var tbody = document.getElementById('pcap_file_table_body');
            console.log($(tbody));

            if (index > tbody.rows.length - 1) {
                return;
            }

            var selected_pcap_file = $(tbody.rows[index].cells[0]).text();
            var lastModified = $(tbody.rows[index].cells[1]).text();
            var size = $(tbody.rows[index].cells[2]).text();
            var num_hosts = $(tbody.rows[index].cells[3]).text();
        
            self.selects['files'].push(selected_pcap_file);
            self.parse_file_pcap({
                name: selected_pcap_file,
                lastModifiedDate: lastModified,
                lastModified: '',
                size: size,
                num_hosts: num_hosts
            });
            console.log(selected_pcap_file);
        });

        // self.peek();
    };

    self.on_unselect_pcap_file = function( event, ui ) {
        console.log("EVENT:", event);
        console.log("UI:", ui);
    
        // Retrieve the unselected pcap file from the table cell.
        var unselected_pcap_file = $(ui.unselected.cells[0]).text();
        var unselect_index = self.selects['files'].indexOf(unselected_pcap_file);

        if (unselect_index === -1) { return; }

        self.selects['files'].splice(unselect_index, 1);
        console.log(unselected_pcap_file);
        self.clear_cache(unselected_pcap_file);

        self.peek();
    };
};