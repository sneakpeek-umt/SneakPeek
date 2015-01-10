__author__ = 'Kevin Hernandez'

import sys
import os
import time
from datetime import datetime

import re
import binascii

from messager import Messager
from hex_builder import *
#from hex_rosetta import *
from hex_rosetta_full import *

class Distiller:

	def __init__(self, data_directory, pull_port='5555', push_port='5556'):
		self.data_directory = data_directory
		self.messager = Messager(pull_port=pull_port, push_port=push_port)
		
		self.build = Builder()
		self.dict = Rosetta()

		self.header_marker = '[--> HEADER <--]'
		self.hm_len = len(self.header_marker)
		self.broken_header = 'fae'

	def __on_receive_command(self, message):
		print message

		if message['payload']['command'] == 'parse_file_pcap':
			file_name = message['payload']['filename']
			file_path = os.path.join(self.data_directory, file_name)
			self._read_file(file_path)
			# x._read_file('../app/uploads/evidence01.pcap')
			# x._read_file('../app/uploads/evidence-malware.pcap')
			# x._read_file('../app/uploads/evidence01-talkers.pcap')
		
	def _read(self, _hex):
		read = self._format_lines(binascii.hexlify(_hex))
		return read

	def _read_file(self, afile, num_fails=0, max_fails=3):
		try:
			_file = open(afile, 'rb')
		except:
			if num_fails < max_fails:
				num_fails += 1;
				time.sleep(2*num_fails);
				self._read_file(afile, num_fails, max_fails)
				return

			else:
				return

		file_to_list = []

		for row in list(_file):
			''
			# get user-agent and host
			plain_text = row
			temp = self.dict.sifter(plain_text)
			if temp is not None:
				print(temp)

			pcap_string = self.dict._format_lines(binascii.hexlify(row))
			highlight_header = re.sub('[0-9][a-f]000000[0-9][a-f]000000', self.header_marker, pcap_string)
			file_to_list.append(highlight_header)
			
		try:
			# catch complete packets
			for line in file_to_list:
				if self.header_marker in line and not self.broken_header in line:
					#print(line) # test output is read
					# setup 1st check
					hdr_len_byte1 = line.index(self.header_marker) + 28 # find index
					header_check1 = hdr_len_byte1 + self.hm_len # verify header w/length byte
					# setup 2nd check
					hdr_len_byte2 = line.index(self.header_marker) + 92 # find index
					header_check2 = hdr_len_byte2 + self.hm_len # verify header w/2nd length byte
					if line[header_check1] is '4': # initial confirmation of header
						self.peruse_pcap(line)
						try:
							if line[header_check2] is '5': # catches only complete headers
								self.peruse_pcap(line)
						except:
							pass
		except:
			for line in file_to_list:
				if self.header_marker in line and not self.broken_header in line:
					self.peruse_pcap(line)

	def receive_command(self):
		self.messager.receive_message(self.__on_receive_command)

	def peruse_pcap(self, apcap):
		get_header = apcap.index(self.header_marker) # find header starting index
		header_offset = get_header + self.hm_len

		''' beginning reference point '''
		des_mac = header_offset						# 1
		des_ip = header_offset + 60 				# 5
		des_port = header_offset + 72				# 7

		_src_mac = header_offset + 12				# 2
		_src_ip = header_offset + 52				# 4
		_src_port = header_offset + 68 				# 6

		prot = header_offset + 46					# 3

		''' ending reference point'''
		dest_mac_offset = des_mac + 12
		dest_ip_offset = des_ip + 8
		dest_port_offset = des_port + 4
		_src_mac_offset = _src_mac + 12
		_src_ip_offset = _src_ip + 8
		_src_port_offset = _src_port + 4 
		protocol_offset = prot + 2
		
		try:			
			#!works
			destination_mac = self.build.rebuild_mac(str(apcap[des_mac:dest_mac_offset]))
			_source_mac = self.build.rebuild_mac(str(apcap[_src_mac:_src_mac_offset]))
			protocol_type = self.build.define_prot(str(apcap[prot:protocol_offset]))
			_source_ip = self.build.rebuild_ip(str(apcap[_src_ip:_src_ip_offset]))
			destination_ip = self.build.rebuild_ip(str(apcap[des_ip:dest_ip_offset]))
			_source_port  = self.build.rebuild_port(str(apcap[_src_port:_src_port_offset]))
			destination_port = self.build.rebuild_port(str(apcap[des_port:dest_port_offset]))

			print('Protocol: ' + protocol_type)
			print('')
			print('\t\tSource:') # print('\tSource:')
			print('Mac:\t' + _source_mac)
			print('IP:\t\t' + _source_ip) # print('IP:\t' + _source_ip)
			print('Port:\t' + str(_source_port))

			print('')
			print('\t\tDestination:') # print('\tSource:')
			print('Mac:\t' + destination_mac)
			print('IP:\t\t' + destination_ip) # print('IP:\t' + destination_ip)
			print('Port:\t' + str(destination_port))
			
			print('\n------------------------------------------\n')

			#+ Send Message
			now = datetime.now().isoformat(' ')
			message = {
				'timestamp': now,
				'source': 'Distiller',
				'destination': 'SneakPeek',
				'payload': {
					'command': 'show',
					'protocol_type': protocol_type,
					'shost': {
						'source_mac': _source_mac,
						'source_ip': _source_ip,
						'source_port': _source_port
					},
					'dhost': {
						'destination_mac': destination_mac,
						'destination_ip': destination_ip,
						'destination_port': destination_port
					}
				}
			}

			self.messager.send_message(message);
			#- Send Message

		except:
			pass
		
if __name__ == '__main__':
	distiller = Distiller('../app/uploads')
	while True:
		distiller.receive_command()