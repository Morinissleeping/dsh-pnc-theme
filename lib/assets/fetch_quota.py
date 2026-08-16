import requests, json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
# creds 路径优先取命令行参数（由 host 传入），缺省回退到环境变量或跨平台默认位置
creds_path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('PNC_CREDS_PATH', os.path.join(os.path.expanduser('~'), '.dsh', 'pnc_creds.json'))
c = json.load(open(creds_path, encoding='utf-8-sig'))  # utf-8-sig 兼容带/不带 BOM
url = 'https://opencode.ai/workspace/' + c['workspace_id'] + '/go'
h = {
    'cookie': 'auth=' + c['cookie'],
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'accept': 'text/html,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9',
    'referer': 'https://opencode.ai/',
}
try:
    r = requests.get(url, headers=h, timeout=25)
    sys.stdout.write(r.text)
except Exception as e:
    sys.stderr.write('FETCH_ERR ' + str(e))
    sys.exit(1)
