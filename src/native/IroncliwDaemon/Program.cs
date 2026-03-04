using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Net;
using System.IO;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Drawing;
using System.Threading;

namespace IroncliwNative
{
    class Program
    {
        [DllImport("user32.dll")]
        static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        const uint SWP_SHOWWINDOW = 0x0040;

        static void Main(string[] args)
        {
            Console.WriteLine("[Ironcliw-Native] Daemon starting on port 18790...");
            
            HttpListener listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:18790/");
            listener.Start();

            while (true)
            {
                HttpListenerContext context = listener.GetContext();
                HttpListenerRequest request = context.Request;
                HttpListenerResponse response = context.Response;

                string responseString = "{\"status\":\"ok\"}";
                
                if (request.HttpMethod == "POST")
                {
                    StreamReader reader = new StreamReader(request.InputStream, request.ContentEncoding);
                    string body = reader.ReadToEnd();
                    Console.WriteLine("[Ironcliw-Native] Received: " + body);
                    
                    if (body.Contains("WINDOW_CONTROL"))
                    {
                        HandleWindowControl(body);
                    }
                    else if (body.Contains("CLIPBOARD_READ"))
                    {
                        string clipText = "";
                        Thread t = new Thread(delegate() { clipText = Clipboard.GetText(); });
                        t.SetApartmentState(ApartmentState.STA);
                        t.Start();
                        t.Join();
                        responseString = "{\"status\":\"ok\", \"data\":\"" + clipText.Replace("\"", "\\\"").Replace("\n", "\\n") + "\"}";
                    }
                }

                byte[] buffer = System.Text.Encoding.UTF8.GetBytes(responseString);
                response.ContentLength64 = buffer.Length;
                response.ContentType = "application/json";
                Stream output = response.OutputStream;
                output.Write(buffer, 0, buffer.Length);
                output.Close();
            }
        }

        static void HandleWindowControl(string body)
        {
            try {
                if (body.Contains("Burp Suite")) {
                    IntPtr hWnd = FindWindow(null, "Burp Suite Professional");
                    if (hWnd == IntPtr.Zero) hWnd = FindWindow(null, "Burp Suite Community Edition");
                    
                    if (hWnd != IntPtr.Zero) {
                        SetForegroundWindow(hWnd);
                        SetWindowPos(hWnd, IntPtr.Zero, 0, 0, 1024, 768, SWP_SHOWWINDOW);
                    }
                }
            } catch (Exception ex) {
                Console.WriteLine("[Ironcliw-Native] Error: " + ex.Message);
            }
        }
    }
}
