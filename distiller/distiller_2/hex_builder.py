__author__ = 'Kevin Hernandez'
# it-wingman@outlook.com
# Description: Parses a hex string to build specific output.
#
# Last edited: 12/8/14

import binascii

class Builder:

	def __init__(self):
		pass
	
	def _port(self, astring):
		'''
		Converts port hex value to decimal output.
		'''
		port = int(astring, 16)
		if port is not None and port is not 0:
			return port
		else:
			return None

	def _ip(self, astring):
		'''
		Converts ip hex value to decimal
		and formats string output.
		'''
		ip_list = list(astring[::-1])
		
		a = str(ip_list.pop())
		b = str(ip_list.pop())
		c = str(a)+str(b)
		ip1 = int(c, 16)

		d = str(ip_list.pop())
		e = str(ip_list.pop())
		f = str(d) + str(e)
		ip2 = int(f, 16)		

		g = str(ip_list.pop())
		h = str(ip_list.pop())
		i = str(g) + str(h)
		ip3 = int(i, 16)

		j = str(ip_list.pop())
		k = str(ip_list.pop())
		l = str(j) + str(k)
		ip4 = int(l, 16)

		ip = str(ip1)+'.'+str(ip2)+'.'+str(ip3)+'.'+str(ip4)

		if ip1 >= 10 and ip1 != 0:
			return ip
		else:
			return None



	def _mac(self, astring):
		'''
		Converts mac hex value to decimal
		and formats string output.
		'''
		impossible_mac = 'ff:ff:ff:ff:ff:ff'

		str_list = list(astring)
		mac_list = []
		mac_list.append(str_list[0] + str_list[1])
		mac_list.append(str_list[2] + str_list[3])
		mac_list.append(str_list[4] + str_list[5])
		mac_list.append(str_list[6] + str_list[7])
		mac_list.append(str_list[8] + str_list[9])
		mac_list.append(str_list[10] + str_list[11])
		
		mac = ''
		for i in range(len(mac_list)):
			mac += str(mac_list[i])
			if i < 5:
				mac += ':'
		if mac == impossible_mac:
			return str(mac) + ' (\'Broadcast\')'
		elif mac is not None:
			return mac
		else:
			return None

	def _ipv6_ip(self, astring):
		'''
		Converts ipv6 hex value to decimal
		and formats string output.
		'''
		standard_query = 'ff02:'
		str_list = list(astring)
		ip_list = []
		ip_list.append(str(str_list[0] + str_list[1] + str_list[2] + str_list[3])+':')
		ip_list.append(str_list[17] + str_list[18] + str_list[19] + str_list[20])
		ip_list.append(str_list[21] + str_list[22] + str_list[23] + str_list[24])
		ip_list.append(str_list[25] + str_list[26] + str_list[27] + str_list[28])
		ip_list.append(str_list[29] + str_list[30] + str_list[31] + str_list[32])

		ip = ''
		for i in range(len(ip_list)):
			ip += str(ip_list[i])
			if i < 4:
				ip += ':'

		if ip_list[0] == standard_query:
			return str(ip_list[0])+':fb' + ' (\'Standard Query\')'
		else:
			return ip

	def define_prot(self, aprotocol):
		'''
		Protocol Dictionary
		'''
		prot = {'00':'HOPOPT','01':'ICMP','02':'IGMP','03':'GGP','04':'IP-in-IP',
		'05':'ST','06':'TCP','07':'CBT','08':'EGP','09':'IGP','0a':'BBN-RCC-MON',
		'0b':'NVP-II','0c':'PUP','0d':'ARGUS','0e':'EMCON','0f':'XNET',
		'10':'CHAOS','11':'UDP','12':'MUX','13':'DCN-MEAS','14':'HMP','15':'PRM',
		'16':'XNS-IDP','17':'TRUNK-1','18':'TRUNK-2','19':'LEAF-1','1a':'LEAF-2',
		'1b':'RDP','1c':'IRTP','1d':'ISO-TP4','1e':'NETBLT','1f':'MFE-NSP',
		'20':'MERIT-INP','21':'DCCP','22':'3PC','23':'IDPR','24':'XTP','25':'DDP',
		'26':'IDPR-CMTP','27':'TP++','28':'IL','29':'IPv6','2a':'SDRP',
		'2b':'IPv6-Route','2c':'IPv6-Frag','2d':'IDRP','2e':'RSVP','2f':'GRE',
		'30':'MHRP','31':'BNA','32':'ESP','33':'AH','34':'I-NLSP','35':'SWIPE',
		'36':'NARP','37':'MOBILE','38':'TLSP','39':'SKIP','3a':'IPv6-ICMP',
		'3b':'IPv6-NoNxt','3c':'IPv6-Opts','3d':'Any host internal protocol',
		'3e':'CFTP','3f':'Any local network','40':'SAT-EXPAK','41':'KRYPTOLAN',
		'42':'RVD','43':'IPPC','44':'Any distributed file system','45':'SAT-MON',
		'46':'VISA','47':'IPCU','48':'CPNX','49':'CPHB','4a':'WSN','4b':'PVP',
		'4c':'BR-SAT-MON','4d':'SUN-ND','4e':'WB-MON','4f':'WB-EXPAK','50':'ISO-IP',
		'51':'VMTP','52':'SECURE-VMTP','53':'VINES','54':'TTP','54':'IPTM','55':'NSFNET-IGP',
		'56':'DGP','57':'TCF','58':'EIGRP','59':'OSPF','5a':'Sprite-RPC','5b':'LARP',
		'5c':'MTP','5d':'AX.25','5e':'IPIP','5e':'MICP','60':'SCC-SP','61':'ETHERIP',
		'62':'ENCAP','63':'Any private encryption scheme','64':'GMTP','65':'IFMP',
		'66':'PNNI','67':'PIM','68':'ARIS','69':'SCPS','6a':'QNX','6b':'A/N','6c':'IPComp',
		'6d':'SNP','6e':'Compaq-Peer','6f':'IPX-in-IP','70':'VRRP','71':'PGM',
		'72':'Any 0-hop protocol','73':'L2TP','74':'DDX','75':'IATP','76':'STP',
		'77':'SRP','78':'UTI','79':'SMP','7a':'SM','7b':'PTP','7c':'IS-IS over IPv4',
		'7d':'FIRE','7e':'CRTP','7f':'CRUDP','80':'SSCOPMCE','81':'IPLT','82':'SPS',
		'83':'PIPE','84':'SCTP','85':'FC','86':'RSVP-E2E-IGNORE','87':'Mobility Header',
		'88':'UDPLite','89':'MPLS-in-IP','8a':'manet','8b':'HIP','8c':'Shim6','8d':'WESP',
		'8e':'ROHC','8f-\'fc':'UNASSIGNED','fd-\'fe':'Use for experimentation and testing',
		'ff':'Reserved'}
		try:
			return prot[aprotocol]
		except:
			#return '[!]' + str(aprotocol)
			return None

	def define_type(self, atype):
		'''
		Service Type Dictionary
		'''
		_type = {'0800':'Internet Protocol version 4 (IPv4)','0806':'Address Resolution Protocol (ARP)',
		'0842':'Wake-on-LAN[3]','22f0':'Audio Video Transport Protocol as defined in IEEE Std 1722-2011',
		'22f3':'IETF TRILL Protocol','6003':'DECnet Phase IV','0600':'XEROX NS IDP','0660':'DLOG','0661':'DLOG',
		'0801':'X.75 Internet','0802':'NBS Internet','0803':'ECMA Internet','0804':'Chaosnet',
		'0805':'X.25 Level 3','0807':'XNS compatability','0808':'Frame Relay ARP',
		'8035':'Reverse Address Resolution Protocol','809b':'AppleTalk (Ethertalk)',
		'80f3':'AppleTalk Address Resolution Protocol (AARP)',
		'8100':'(EAPS) VLAN-tagged frame (IEEE 802.1Q) & Shortest Path Bridging IEEE 802.1aq[4]',
		'8137':'IPX','8138':'IPX','814c':'SNMP, Simple Network Management Protocol',
		'8204':'QNX Qnet','86dd':'Internet Protocol Version 6 (IPv6)',
		'8808':'MPCP, Ethernet flow control','8809':'Slow Protocols (IEEE 802.3)','8819':'CobraNet',
		'880b':'PPP, Point-to-Point Protocol','880c':'GSMP, General Switch Management Protocol',
		'8847':'MPLS unicast','8848':'MPLS multicast','8863':'PPPoE Discovery Stage',
		'8864':'PPPoE Session Stage','886f':'Network Load Balancing','8870':'Jumbo Frames[2]','887b':'HomePlug 1.0 MME',		
		'888e':'EAP over LAN (IEEE 802.1X)','8892':'PROFINET Protocol',
		'889a':'HyperSCSI (SCSI over Ethernet)','88a2':'ATA over Ethernet','88a4':'EtherCAT Protocol',
		'88a8':'Provider Bridging (IEEE 802.1ad) & Shortest Path Bridging IEEE 802.1aq[5]',
		'88ab':'Ethernet Powerlink[citation needed]','88bb':'LWAPP, Light Weight Access Point Protocol',
		'88ca':'TIPC, Transparent Inter Process Communication Protocol.','88cc':'Link Layer Discovery Protocol (LLDP)',
		'88cd':'SERCOS III','88dc':'WSMP, WAVE Short Message Protocol','88e1':'HomePlug AV MME[citation needed]',
		'88e3':'Media Redundancy Protocol (IEC62439-2)','88e5':'MAC security (IEEE 802.1AE)',
		'88f7':'Precision Time Protocol (PTP) over Ethernet (IEEE 1588)',
		'8902':'IEEE 802.1ag Connectivity Fault Management (CFM) Protocol / ITU-T Recommendation Y.1731 (OAM)',
		'8906':'Fibre Channel over Ethernet (FCoE)','8914':'FCoE Initialization Protocol',
		'8915':'RDMA over Converged Ethernet (RoCE)','892f':'High-availability Seamless Redundancy (HSR)',
		'9000':'Ethernet Configuration Testing Protocol[6]','ffff':'Reserved',
		'cafe':'Veritas Low Latency Transport (LLT)[7] for Veritas Cluster Server'}
		try:
			return _type[atype]
		except:
			#return '[!]' + str(atype)
			return None

if __name__ == '__main__':
	test = Builder()
	print(test._port('c7b8'))
	print(test._ip('0a0a0a46'))
	print(test._ipv6_ip('fe8000000000000001c79c70621e454c7'))
	print(test._ipv6_ip('4006e368c0a80102c0a8011ed8c000163'))
	print(test._mac('e0cb4efab9d9'))
	print(test.define_prot('3a'))
