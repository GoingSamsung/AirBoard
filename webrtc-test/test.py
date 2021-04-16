import sys
import socket

def getName(name, age): 
    print (name + " : " + socket.gethostbyname(socket.gethostname()))
    
if __name__ == '__main__':
    getName(sys.argv[1], sys.argv[2])

