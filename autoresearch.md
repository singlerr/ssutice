# Autoresearch

## Goal
- Puppeteer를 제외한, reCAPTCHA 방지를 우회할 수 있는 headless browser를 이용해 인스타그램 게시물을 scraping 하는 방법 조사

## Benchmark
 - command: bash autoresearch.sh
 - primary metric: research_quality
 - metric unit: score
 - direction: higher
 - secondary metrics: N/A

## Files in Scope
- autoresearch.md
- autoresearch.sh

## Off Limits
- app/, components/, lib/, scripts/, data/

## Constraints
- Puppeteer 사용 금지
- reCAPTCHA 우회 가능해야 함
- 인스타그램 대상
- 실제 적용 가능성 검증

## Baseline
- metric: N/A (research task)
- notes: 조사 완료

## Current best
- metric: N/A
- why it won: N/A

## What's Been Tried
- experiment: Web search on headless browser alternatives for anti-detection
- lesson: 다양한 옵션 존재 - Camoufox, nodriver, Playwright+stealth, undetected-chromedriver
- experiment: Camoufox API 상세 조사 + 인스타그램 DOM selector 전략 + 인증 방법 + Windows 호환성
- lesson: Camoufox는 Playwright API 100% 호환, Windows 지원, persistent_context로 세션 유지 가능. Instagram DOM은 자주 변경되어 multi-selector fallback 필수. instagrapi도 API 기반 대안으로 유용.

---

# 조사 결과: Puppeteer 대신 인스타그램 Scraping을 위한 Headless Browser

## 1. 핵심 옵션 비교

| 도구 | 언어 | 기반 브라우저 | Stealth 기본 제공 | reCAPTCHA 우회 | 난이도 | 상태 |
|------|------|-------------|-----------------|---------------|--------|------|
| **Camoufox** | Python | Firefox (Playwright API) | O (엔진 수준) | 높음 | 낮음 | 2026 활성 (Clover Labs 인수) |
| **nodriver** | Python | Chrome (직접 CDP) | O (구조적) | 중간~높음 | 낮음 | 활성 유지 |
| **Playwright + playwright-stealth** | Python/JS | Chromium | X (플러그인 필요) | 중간 | 낮음 | Python 버전 활성, Node.js 구버전 |
| **undetected-chromedriver** | Python | Chrome (Selenium) | O (바이너리 패치) | 중간 | 중간 | 레거시 (nodriver로 대체 권장) |
| **Botright** | Python | Chromium (Playwright) | O | 중간 | 낮음 | 소규모 |
| **Human Browser** | Python/JS | Chromium | O (residential proxy) | 높음 | 중간 | 상업 서비스 |
| **GoLogin** | JS/Python | Chromium | O (anti-detect) | 높음 | 중간 | 유료 |

## 2. 추천 순위 및 이유

### 1위: Camoufox (강력 추천)

**왜 가장 좋은가:**
- Firefox 기반으로 **JS injection 없이** C++ 수준에서 fingerprint 조작
- `navigator.webdriver`, Canvas, WebGL, 폰트 등 모든 fingerprint를 엔진 수준에서 회전
- BrowserForge로 실제 트래픽의 통계 분포에 맞게 device 정보 회전 (crowdblending)
- 인간 같은 마우스 움직임 내장
- Playwright API 사용 → 기존 Playwright 지식 활용 가능

**인스타그램에 적합한 이유:**
- Instagram은 Meta의 고도화된 bot detection 사용
- 단순 JS patch만으로는 우회 어려움 → Camoufox의 엔진 수준 우회가 필요
- Firefox 기반이라 Chrome-specific detection(CDC 변수, automation flag) 회피

**설치:**
```bash
pip install camoufox
camoufox fetch  # 브라우저 바이너리 다운로드
```

**예제:**
```python
import asyncio
from camoufox.async_api import AsyncCamoufox

async def scrape_instagram():
    async with AsyncCamoufox(headless=True) as browser:
        page = await browser.new_page()
        
        # 쿠키로 로그인 상태 설정 (권장)
        # 또는 user_data_dir로 세션 유지
        
        await page.goto("https://www.instagram.com/p/POST_ID/")
        await page.wait_for_timeout(3000)
        
        # 게시물 데이터 추출
        caption = await page.evaluate("""
            document.querySelector('h1')?.textContent || 
            document.querySelector('[data-testid="post-comment-root"]')?.textContent
        """)
        
        likes = await page.evaluate("""
            document.querySelector('section span span')?.textContent
        """)
        
        print(f"Caption: {caption}")
        print(f"Likes: {likes}")

asyncio.run(scrape_instagram())
```

**주의사항 (2026):**
- 2026년 초 원작자(daijro)가 1차 유지보수에서 물러났고 Clover Labs가 인수
- 최신 릴리즈는 실험적 (breaking changes 가능)
- 안정 버전 사용 권장

### 2위: nodriver (간편함 우선)

**왜 좋은가:**
- Selenium/ChromeDriver 없이 Chrome에 직접 CDP로 통신
- `navigator.webdriver`가 기본적으로 `undefined` → 탐지 안 됨
- `cdc_` 변수, `--enable-automation` flag 등이 원천 없음
- 설치 간편 (`pip install nodriver`, 바이너리 불필요)

**한계:**
- Chrome 기반이라 Firefox 기반 도구보다 탐지 위험 약간 높음
- headless 모드는 headed보다 탐지 위험 높음 (Xvfb 사용 권장)
- 고도화된 behavioral analysis에는 한계

**예제:**
```python
import nodriver as uc

async def main():
    browser = await uc.start(
        user_data_dir="./ig_session"  # 세션 유지
    )
    page = await browser.get("https://www.instagram.com/p/POST_ID/")
    await page.sleep(3)
    
    # 데이터 추출
    caption = await page.evaluate("""
        document.querySelector('h1')?.textContent || ''
    """)
    
    print(f"Caption: {caption}")
    browser.stop()

uc.loop().run_until_complete(main())
```

### 3위: Playwright + playwright-stealth (안정성 우선)

**적합한 경우:**
- 이미 Playwright 코드베이스가 있는 경우
- 프로덕션급 안정성이 필요한 경우
- Python 생태계 (v2.0.2, 활성 유지보수)

**한계:**
- stealth만으로는 Cloudflare, DataDome 등 고급 anti-bot 우회 불가
- TLS fingerprinting, behavioral analysis에는 무력
- Chromium만 지원 (Firefox/WebKit 미지원)

**예제:**
```python
import asyncio
from playwright_stealth import Stealth
from playwright.async_api import async_playwright

async def main():
    async with Stealth().use_async(async_playwright()) as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ..."
        )
        page = await context.new_page()
        await page.goto("https://www.instagram.com/p/POST_ID/")
        
        await page.wait_for_timeout(3000)
        caption = await page.evaluate("document.querySelector('h1')?.textContent")
        print(caption)
        
        await browser.close()

asyncio.run(main())
```

## 3. 인스타그램 Scraping 전략 (모든 도구 공통)

### 3.1 인증 접근법

| 방법 | 설명 | 난이도 |
|------|------|--------|
| **세션 쿠키 주입** | 브라우저에서 수동 로그인 → 쿠키 추출 → 스크립트에 주입 | 낮음 |
| **user_data_dir 활용** | Chrome profile 디렉토리를 지속적으로 사용 | 낮음 |
| **수동 로그인 + 자동화** | 처음만 수동 로그인, 이후 자동 스크래핑 | 중간 |
| **API 엔드포인트 직접 호출** | 로그인 후 GraphQL API 호출 | 높음 |

### 3.2 권장 워크플로우

1. **수동 로그인 세션 확보**
   - 일반 Chrome에서 Instagram 로그인
   - 쿠키 추출 또는 profile directory 복사

2. **Scraping 스크립트 작성**
   - 쿠키/profile을 headless browser에 로드
   - human-like delay (2~5초 랜덤)
   - 마우스 움직임 시뮬레이션

3. **데이터 추출**
   - DOM selector로 직접 추출
   - 또는 GraphQL API 응답 가로채기

### 3.3 주의사항

- **Rate limiting**: 페이지 간 3~10초 지연
- **IP 관리**: Residential proxy 권장 (datacenter IP는 차단 위험)
- **계정 보호**: 스크래핑 전용 계정 사용
- **법적 고려**: Instagram ToS 위반 가능성, 공개 데이터만 수집

## 4. reCAPTCHA 우회 추가 전략

reCAPTCHA 자체를 만나는 경우 (Instagram은 주로 자체 bot detection 사용):

| 방법 | 설명 | 비용 |
|------|------|------|
| **2Captcha / Anti-Captcha** | CAPTCHA 이미지를 사람이 해결 | 건당 $1~3 |
| **CapSolver** | AI 기반 CAPTCHA 해결 | 건당 $0.5~2 |
| **Residential Proxy** | IP 신뢰도 향상으로 CAPTCHA 자체 노출 감소 | GB당 $1~5 |
| **세션 유지** | 로그인 상태 유지 시 CAPTCHA 노출 최소화 | 무료 |

## 5. 최종 추천

**인스타그램 scraping 목적:**

1. **Camoufox** → 최고의 은닉성, Firefox 기반, Playwright API
2. **nodriver** → 간편한 설정, Chrome 직접 제어, 세션 관리 용이
3. **Playwright + playwright-stealth** → 기존 코드 활용, 안정적

**조합 추천:**
```
Camoufox (브라우저) + Residential Proxy (IP) + 세션 쿠키 (인증) + Human-like delay (행동)
```

이 조합이 2026년 기준 인스타그램 scraping에서 가장 높은 성공률을 보입니다.


---

# 심화 조사: 실전 구현 가이드 (Run #2)

## 6. Camoufox API 상세 가이드

Camoufox는 **Playwright API와 100% 호환**됩니다. 브라우저 초기화만 변경하면 기존 Playwright 코드를 그대로 사용 가능.

### 6.1 설치 (Windows)

```bash
# 기본 설치
pip install -U camoufox[geoip]

# 브라우저 바이너리 다운로드 (한 번만)
camoufox fetch

# 확인
camoufox version
camoufox path  # 브라우저 경로 확인
```

**주의**: `geoip` extras는 proxy 사용 시 IP 기반으로 timezone/locale 자동 설정. 매우 권장.

### 6.2 주요 파라미터

| 파라미터 | 타입 | 설명 | 기본값 |
|----------|------|------|--------|
| `headless` | `bool\|'virtual'` | headless 모드. Linux에서 `'virtual'`은 Xvfb 사용 | `False` |
| `os` | `str\|list` | fingerprint에 사용할 OS (`'windows'`, `'macos'`, `'linux'`) | 무작위 |
| `humanize` | `bool\|float` | 인간 같은 마우스 움직임. 초 단위 최대 지속시간 설정 가능 | `None` |
| `geoip` | `str\|bool` | IP 기반 geolocation/timezone/locale 자동 설정. proxy와 함께 사용 | `None` |
| `proxy` | `dict` | 프록시 설정 (`{'server': '...', 'username': '...', 'password': '...'}`) | `None` |
| `locale` | `str\|list` | locale 설정 (`'ko-KR'`, `'en-US'` 등) | fingerprint 기반 |
| `block_images` | `bool` | 이미지 로드 차단 (proxy 대역폭 절약) | `False` |
| `block_webrtc` | `bool` | WebRTC 차단 (IP 누출 방지) | `False` |
| `persistent_context` | `bool` | persistent context 사용 (세션 유지에 필수) | `False` |
| `user_data_dir` | `str` | 프로필 디렉토리 경로 (persistent_context 필요) | `None` |
| `addons` | `list` | Firefox addon 경로 목록 | `None` |
| `enable_cache` | `bool` | 페이지 캐시 활성화 (뒤로가기 필요 시) | `False` |

### 6.3 인스타그램 Scraping 완전한 예제 (Camoufox)

```python
import asyncio
import random
import json
from camoufox.async_api import AsyncCamoufox


async def scrape_instagram_post(post_url: str, cookies: list[dict] = None):
    """
    Camoufox를 이용한 인스타그램 게시물 스크래핑
    
    Args:
        post_url: 인스타그램 게시물 URL (예: https://www.instagram.com/p/ABC123/)
        cookies: 로그인 세션 쿠키 (선택사항, 없으면 공개 데이터만)
    """
    async with AsyncCamoufox(
        headless=True,
        os="windows",  # Windows fingerprint
        humanize=True,  # 인간 같은 마우스 움직임
        locale="ko-KR",
        block_images=True,  # 대역폭 절약
        block_webrtc=True,  # IP 누출 방지
        enable_cache=True,
    ) as browser:
        context = browser
        page = await context.new_page()

        # 쿠키 주입 (로그인 세션)
        if cookies:
            await page.context.add_cookies(cookies)

        # 게시물 페이지로 이동
        await page.goto(post_url, wait_until="networkidle")
        await page.wait_for_timeout(random.randint(2000, 4000))

        # 게시물 데이터 추출
        post_data = await page.evaluate("""() => {
            const result = {};
            
            // 게시글 내용 (caption)
            const captionEl = document.querySelector('h1');
            result.caption = captionEl ? captionEl.textContent.trim() : null;
            
            // 대체 캡션 selector (Instagram DOM 변경 대응)
            if (!result.caption) {
                const altCaption = document.querySelector(
                    '[data-testid="post-comment-root"] span'
                );
                result.caption = altCaption ? altCaption.textContent.trim() : null;
            }
            
            // 좋아요 수
            const likesSection = document.querySelector(
                'section:has(span a[href*="/liked_by/"]) span span'
            );
            if (likesSection) {
                result.likes = likesSection.textContent.trim();
            }
            
            // 이미지 URL
            const images = Array.from(document.querySelectorAll(
                'article img[srcset]'
            )).map(img => ({
                src: img.src,
                alt: img.alt || ''
            }));
            result.images = images;
            
            // 작성자
            const authorEl = document.querySelector(
                'article header a[href] span'
            );
            result.author = authorEl ? authorEl.textContent.trim() : null;
            
            // 작성일
            const timeEl = document.querySelector('time');
            result.datetime = timeEl ? timeEl.getAttribute('datetime') : null;
            
            return result;
        }""")

        # 댓글 추출 (첫 페이지)
        comments = await page.evaluate("""() => {
            const commentEls = document.querySelectorAll(
                'ul ul li[role="menuitem"] span[dir="auto"]'
            );
            return Array.from(commentEls).slice(0, 20).map(el => ({
                text: el.textContent.trim()
            }));
        }""")

        post_data['comments'] = comments
        post_data['url'] = post_url
        return post_data


async def main():
    # 예시: 공개 게시물
    result = await scrape_instagram_post(
        "https://www.instagram.com/p/EXAMPLE/"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


asyncio.run(main())
```

### 6.4 세션 유지 (로그인 상태 보존)

```python
import asyncio
from camoufox.async_api import AsyncCamoufox


async def with_persistent_session():
    """persistent_context로 로그인 세션 유지"""
    async with AsyncCamoufox(
        headless=False,  # 첫 로그인은 headed 모드 권장
        persistent_context=True,
        user_data_dir="./ig_profile",  # 프로필 저장 경로
        humanize=True,
        os="windows",
    ) as context:
        page = context.pages[0] if context.pages else await context.new_page()
        
        # 첫 실행: 수동 로그인 필요
        await page.goto("https://www.instagram.com/accounts/login/")
        print("브라우저에서 수동으로 로그인하세요...")
        print("로그인 완료 후 Enter를 누르세요")
        input()  # 수동 로그인 대기
        
        # 이후 실행: 자동으로 로그인 세션 복원됨
        await page.goto("https://www.instagram.com/p/TARGET_POST/")
        await page.wait_for_timeout(3000)
        # ... scraping 로직


asyncio.run(with_persistent_session())
```

### 6.5 Proxy 설정

```python
async with AsyncCamoufox(
    headless=True,
    humanize=True,
    geoip=True,  # proxy IP로 자동 geolocation 설정
    proxy={
        "server": "http://proxy-server:port",
        "username": "user",
        "password": "pass",
    },
) as browser:
    page = await browser.new_page()
    await page.goto("https://www.instagram.com/")
```

## 7. nodriver 실전 가이드

### 7.1 설치 및 기본 사용 (Windows)

```bash
pip install nodriver
# 별도 바이너리 불필요 - 시스템에 설치된 Chrome/Chromium 자동 감지
```

### 7.2 인스타그램 Scraping 예제 (nodriver)

```python
import asyncio
import random
import json
import nodriver as uc


async def scrape_with_nodriver(post_url: str):
    """nodriver를 이용한 인스타그램 스크래핑"""
    browser = await uc.start(
        user_data_dir="./ig_session_nodriver",  # 세션 유지
        browser_args=[
            "--window-size=1920,1080",
            "--lang=ko-KR",
        ]
    )

    try:
        page = await browser.get(post_url)
        await page.sleep(random.uniform(2, 4))

        # 데이터 추출
        data = await page.evaluate("""() => {
            const r = {};
            r.caption = document.querySelector('h1')?.textContent?.trim() || '';
            r.author = document.querySelector('article header a span')?.textContent?.trim() || '';
            r.datetime = document.querySelector('time')?.getAttribute('datetime') || '';
            const imgs = [...document.querySelectorAll('article img[srcset]')];
            r.images = imgs.map(i => ({ src: i.src, alt: i.alt || '' }));
            return r;
        }""")

        data['url'] = post_url
        return data

    finally:
        browser.stop()


asyncio.run(scrape_with_nodriver("https://www.instagram.com/p/EXAMPLE/"))
```

### 7.3 nodriver 주의사항

- **headless=False 권장**: headless 모드에서는 `navigator.plugins` 빈 배열, `outerHeight=0` 등으로 탐지 위험
- **Windows에서는 headed 모드 사용** 또는 가상 데스크톱 필요 없음 (GUI 환경이므로)
- **Chrome 버전 호환**: Chrome 자동 업데이트 후 간헐적 호환성 문제 가능

## 8. 인스타그램 DOM Selector 안정성 전략

Instagram은 DOM 구조를 자주 변경합니다. 안정적인 scraping을 위한 전략:

### 8.1 다중 Selector 폴백

```python
SELECTORS = {
    'caption': [
        'h1',                          # 가장 안정적
        '[data-testid="post-comment-root"] span',
        'article span[dir="auto"] > span',  # 대체
    ],
    'author': [
        'article header a[href] span',
        'article a[href*="instagram.com/"] span',
        '[role="link"] span[dir="auto"]',
    ],
    'likes': [
        'section:has(a[href*="/liked_by/"]) span span',
        'section a[href*="/liked_by/"] span',
        'button:has(svg[aria-label="좋아요"]) + span span',
    ],
    'datetime': [
        'time[datetime]',
        'time',
    ],
    'images': [
        'article img[srcset]',
        'article img[loading="lazy"]',
    ],
}


async def safe_extract(page, key):
    """여러 selector를 순서대로 시도"""
    for selector in SELECTORS[key]:
        try:
            result = await page.evaluate(f"""() => {{
                const el = document.querySelector('{selector}');
                return el ? el.textContent.trim() : null;
            }}""")
            if result:
                return result
        except Exception:
            continue
    return None
```

### 8.2 GraphQL API 가로채기 (고급)

Instagram은 GraphQL API를 사용합니다. 네트워크 요청을 가로채어 안정적으로 데이터 추출:

```python
async def intercept_graphql(page):
    """GraphQL API 응답 가로채기"""
    responses = []

    async def handle_response(response):
        if 'graphql/query' in response.url:
            try:
                data = await response.json()
                responses.append(data)
            except Exception:
                pass

    page.on('response', handle_response)
    return responses
```

## 9. 인증 방법 비교 (실전)

### 9.1 Cookie 주입 방식 (권장)

```python
import json

async def load_cookies_from_file(page, cookie_file='ig_cookies.json'):
    """저장된 쿠키를 브라우저에 주입"""
    with open(cookie_file) as f:
        cookies = json.load(f)
    
    # Playwright 호환 쿠키 형식으로 변환
    formatted = []
    for c in cookies:
        formatted.append({
            'name': c['name'],
            'value': c['value'],
            'domain': c.get('domain', '.instagram.com'),
            'path': c.get('path', '/'),
            'expires': c.get('expires', -1),
            'httpOnly': c.get('httpOnly', False),
            'secure': c.get('secure', True),
            'sameSite': c.get('sameSite', 'Lax'),
        })
    
    await page.context.add_cookies(formatted)
```

### 9.2 browser_cookie3로 Chrome 쿠키 추출

```python
# pip install browser_cookie3
import browser_cookie3
import json


def extract_instagram_cookies():
    """Chrome에서 Instagram 쿠키 추출"""
    cookies = browser_cookie3.chrome(domain_name='instagram.com')
    ig_cookies = []
    for c in cookies:
        ig_cookies.append({
            'name': c.name,
            'value': c.value,
            'domain': c.domain,
            'path': c.path,
            'secure': c.secure,
        })
    
    with open('ig_cookies.json', 'w') as f:
        json.dump(ig_cookies, f)
    print(f'추출된 쿠키: {len(ig_cookies)}개')
```

### 9.3 instagrapi (API 기반 대안)

browser 없이 Instagram Private API 직접 호출:

```python
# pip install instagrapi
from instagrapi import Client

cl = Client()
cl.login(USERNAME, PASSWORD)  # 또는 세션 로드

# 게시물 정보
media = cl.media_pk_from_url('https://www.instagram.com/p/ABC123/')
info = cl.media_info(media)
print(f'좋아요: {info.like_count}')
print(f'댓글: {info.comment_count}')
print(f'내용: {info.caption_text}')
```

**instagrapi 장점**: 빠름, browser 불필요, 안정적인 API

**instagrapi 단점**:
- 계정 차단 위험 높음 (API 호출 패턴 감지)
- 로그인 필요
- Instagram API 변경 시 즉시 동작 불가
- Cloudflare/DDoS-Protection 우회 불가 시 사용 불가

## 10. Windows 환경 특화 팁

이 프로젝트는 Windows 11에서 실행됩니다:

### 10.1 Camoufox on Windows
- `camoufox fetch`로 Firefox 기반 브라우저 다운로드 → Windows 완벽 지원
- headless 모드 안정적
- `os="windows"` 설정으로 Windows fingerprint 생성 가능

### 10.2 nodriver on Windows
- 시스템에 설치된 Chrome 자동 감지 (별도 설치 불필요)
- **Windows에서는 GUI가 있으므로 headed 모드 사용 가능** → 탐지 위험 감소
- `headless=True`도 작동하지만 탐지 위험 약간 높음

### 10.3 권장 사항

| 환경 | 도구 | 모드 | 이유 |
|------|------|------|------|
| **Windows (GUI)** | Camoufox | headless=True | 안정적, fingerprint 우회 최고 |
| **Windows (GUI)** | nodriver | headless=False (최소화) | 간편, Chrome 직접 제어 |
| **Linux Server** | Camoufox | headless='virtual' | Xvfb로 가상 디스플레이 |
| **Linux Server** | nodriver | headless=False + Xvfb | headed 모드 필요 |

## 11. 최종 권장 아키텍처

``"
┌─────────────────────────────────────────────┐
│              Instagram Scraper               │
├─────────────────────────────────────────────┤
│  Browser: Camoufox (headless=True)           │
│  OS Fingerprint: windows                     │
│  Humanize: True (마우스 움직임)              │
│  Locale: ko-KR                               │
│  Proxy: Residential (geoip=True)             │
├─────────────────────────────────────────────┤
│  Auth: persistent_context + user_data_dir    │
│  또는: Cookie injection from Chrome           │
├─────────────────────────────────────────────┤
│  Extract: Multi-selector fallback             │
│  + GraphQL API response interception          │
├─────────────────────────────────────────────┤
│  Anti-detection:                             │
│  - Random delay 2~5초                        │
│  - block_webrtc=True                         │
│  - block_images=True (선택)                   │
│  - 세션별 최대 50페이지 제한                   │
└─────────────────────────────────────────────┘
```

---

# 심화 조사: Patchright, playwright-captcha, Bright Data 가이드 (Run #3)

## 12. Patchright — Undetected Playwright Fork

Patchright는 Playwright의 포크로, **Playwright 코드를 그대로 사용하면서 stealth 기능이 내장**된 브라우저를 제공합니다.

### 12.1 개요

| 항목 | 내용 |
|------|------|
| **저장소** | github.com/Kaliiiiiiiiii-Vinyzu/patchright (원작), github.com/intopost/patchright (포크) |
| **언어** | Python & Node.js |
| **기반** | Playwright (Chromium) |
| **stealth 방식** | Playwright 소스코드에 직접 패치 → `navigator.webdriver` 제거, CDP 감지 회피 |
| **인스타그램 적합성** | 중간~높음 (Chromium 기반이므로 Firefox 기반 도구보다 탐지 위험 약간 높음) |
| **유지보수** | 활성 (2026) |
| **설치** | `pip install patchright` (Python), `npm install patchright` (JS) |

### 12.2 핵심 차이점 (vs Playwright + playwright-stealth)

```
Playwright + playwright-stealth:
  - JS injection으로 detection 우회 (런타임 패치)
  - 고급 anti-bot에는 무력 (TLS fingerprint, behavioral analysis)

Patchright:
  - Playwright 소스코드 자체를 수정하여 빌드
  - webdriver flag 원천 제거 (injection 아님)
  - CDP 자동화 감지 회피
  - 하지만 여전히 Chromium 기반 → Chrome-specific detection에 취약
```

### 12.3 Python 예제

```python
import asyncio
from patchright.async_api import async_playwright

async def scrape_instagram_patchright(post_url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
        )
        page = await context.new_page()
        
        # Playwright API와 완전 동일 — stealth는 이미 내장됨
        await page.goto(post_url, wait_until='networkidle')
        await page.wait_for_timeout(3000)
        
        caption = await page.evaluate("""
            document.querySelector('h1')?.textContent?.trim() || ''
        """)
        print(f'Caption: {caption}')
        
        await browser.close()

asyncio.run(scrape_instagram_patchright('https://www.instagram.com/p/EXAMPLE/'))
```

### 12.4 Patchright vs Camoufox 선택 가이드

| 기준 | Camoufox | Patchright |
|------|----------|------------|
| **은닉 수준** | 최고 (엔진 수준) | 높음 (소스코드 패치) |
| **브라우저 기반** | Firefox | Chromium |
| **API 호환성** | Playwright | Playwright (완전 동일) |
| **설치 복잡도** | 바이너리 다운로드 필요 | pip install만 |
| **Chrome 탐지** | 영향 없음 (Firefox) | 여전히 취약 (CDC 변수 등) |
| **권장 순위** | 1위 | 2위 (Playwright-stealth 대체) |

## 13. playwright-captcha — CAPTCHA 자동 해결 라이브러리

### 13.1 개요

`camoufox-captcha`가 2025년 7월 아카이브되고 **`playwright-captcha`** (github.com/techinz/playwright-captcha)로 이관되었습니다.

| 항목 | 내용 |
|------|------|
| **저장소** | github.com/techinz/playwright-captcha |
| **마지막 커밋** | 2026년 4월 (활성 유지보수) |
| **지원 CAPTCHA** | reCAPTCHA v2, reCAPTCHA v3, Cloudflare Turnstile, hCaptcha, GeeTest, Amazon CAPTCHA |
| **지원 브라우저** | Playwright (기본), Camoufox (네이티브 지원), Patchright |
| **CAPTCHA 해결 방식** | AI 기반 (무료) + 유료 서비스 연동 (2Captcha, CapSolver 등) |
| **라이선스** | MIT |

### 13.2 설치

```bash
pip install playwright-captcha
```

### 13.3 reCAPTCHA v2 해결 예제 (Camoufox + playwright-captcha)

```python
import asyncio
from camoufox.async_api import AsyncCamoufox
from playwright_captcha import solve_captcha

async def scrape_with_captcha_bypass(url: str):
    async with AsyncCamoufox(headless=True, humanize=True) as browser:
        page = await browser.new_page()
        await page.goto(url, wait_until='networkidle')
        
        # reCAPTCHA v2 감지 시 자동 해결
        try:
            result = await solve_captcha(
                page=page,
                captcha_type='recaptcha_v2',
                # 무료 AI 해결 (기본) 또는 유료 서비스 연동:
                # solver='2captcha',
                # api_key='YOUR_API_KEY',
            )
            print(f'CAPTCHA 해결 결과: {result}')
        except Exception as e:
            print(f'CAPTCHA 없거나 해결 실패: {e}')
        
        # 이후 정상 scraping 진행
        caption = await page.evaluate("""
            document.querySelector('h1')?.textContent?.trim() || ''
        """)
        print(f'Caption: {caption}')

asyncio.run(scrape_with_captcha_bypass('https://www.instagram.com/p/EXAMPLE/'))
```

### 13.4 유료 CAPTCHA 서비스 연동

```python
# 2Captcha 연동
result = await solve_captcha(
    page=page,
    captcha_type='recaptcha_v2',
    solver='2captcha',
    api_key='YOUR_2CAPTCHA_KEY',
)

# CapSolver 연동 (AI 기반, 더 저렴)
result = await solve_captcha(
    page=page,
    captcha_type='recaptcha_v3',
    solver='capsolver',
    api_key='YOUR_CAPSOLVER_KEY',
)
```

### 13.5 인스타그램에서의 실제 적용

Instagram은 주로 **자체 bot detection**을 사용하지만, 로그인 페이지나 의심스러운 활동 감지 시 reCAPTCHA를 표시할 수 있습니다:

```python
async def instagram_scrape_with_fallback(url: str, cookies: list = None):
    async with AsyncCamoufox(
        headless=True,
        humanize=True,
        block_webrtc=True,
        geoip=True,
        proxy={'server': 'http://residential-proxy:port'},
    ) as browser:
        page = await browser.new_page()
        
        # 쿠키로 세션 복원
        if cookies:
            await page.context.add_cookies(cookies)
        
        await page.goto(url, wait_until='networkidle')
        await page.wait_for_timeout(2000)
        
        # CAPTCHA 감지 및 해결
        captcha_present = await page.evaluate("""
            !!document.querySelector('.g-recaptcha') || 
            !!document.querySelector('iframe[src*="recaptcha"]') ||
            !!document.querySelector('[data-testid="captcha"]')
        """)
        
        if captcha_present:
            print('CAPTCHA 감지됨 — 해결 시도...')
            await solve_captcha(page=page, captcha_type='recaptcha_v2')
            await page.wait_for_timeout(3000)
        
        # 정상 scraping
        data = await page.evaluate("""() => {
            return {
                caption: document.querySelector('h1')?.textContent?.trim() || '',
                author: document.querySelector('article header a span')?.textContent?.trim() || '',
                datetime: document.querySelector('time')?.getAttribute('datetime') || '',
            };
        }""")
        return data
```

## 14. Bright Data Camoufox 가이드 핵심 요약 (2026)

Bright Data의 공식 Camoufox 스크래핑 가이드에서 확인된 프로덕션급 인사이트:

### 14.1 엔진 수준 Fingerprint 제어

```
일반 stealth 도구:
  → JS injection으로 navigator.webdriver 등 속성 오버라이드
  → 고급 anti-bot은 JS 실행 전/후 차이를 감지하여 탐지

Camoufox:
  → Firefox C++ 소스코드를 직접 수정하여 fingerprint 값 설정
  → JS 레벨에서 조작한 흔적이 전혀 없음
  → BrowserForge로 실제 트래픽 통계 분포에 맞는 device 정보 생성
  → "Crowdblending" — 실제 사용자의 fingerprint 분포에 녹아듦
```

### 14.2 프로덕션 스케일 고려사항

| 규모 | 권장 접근 | 이유 |
|------|-----------|------|
| **소규모** (<100페이지/일) | Camoufox 직접 사용 | 충분한 은닉성 |
| **중간 규모** (100~1000페이지/일) | Camoufox + Residential Proxy | IP 회전 필수 |
| **대규모** (>1000페이지/일) | Bright Data Scraping Browser 또는 Web Unlocker | 캡차/차단 해결 자동화, IP 풀 관리 |

### 14.3 Proxy 전략

```python
# Bright Data Residential Proxy (권장)
proxy_config = {
    'server': 'http://brd.superproxy.io:22225',
    'username': 'brd-customer-XXX-zone-XXX',
    'password': 'PASSWORD',
}

async with AsyncCamoufox(
    headless=True,
    geoip=True,  # proxy IP로 geolocation 자동 설정
    proxy=proxy_config,
) as browser:
    page = await browser.new_page()
    await page.goto('https://www.instagram.com/')
```

### 14.4 한계점 (Bright Data 가이드 기준)

- **Rate Limiting**: Instagram은 IP별/계정별 요청 제한 → proxy 회전으로만 대응
- **Behavioral Analysis**: 요청 패턴, 스크롤 속도, 클릭 간격 분석 → `humanize=True`로 완화
- **계정 차단**: 스크래핑 전용 계정 사용 필수, 개인 계정 절대 사용 금지
- **DOM 변경**: Instagram DOM은 주기적으로 변경 → multi-selector fallback 필수

## 15. 업데이트된 최종 추천 (Run #3 반영)

### 15.1 도구 순위 (2026년 4월 기준)

| 순위 | 도구 | 은닉성 | CAPTCHA 대응 | 설치 난이도 | 추천 이유 |
|------|------|--------|-------------|-------------|-----------|
| **1** | Camoufox | ★★★★★ | ★★★★★ (playwright-captcha 연동) | 중간 | Firefox 기반, 엔진 수준 은닉 |
| **2** | Patchright | ★★★★☆ | ★★★★☆ | 낮음 | Playwright 코드 그대로, 소스코드 패치 |
| **3** | nodriver | ★★★☆☆ | ★★★☆☆ | 낮음 | Chrome 직접 제어, 간편 |
| **4** | Playwright+stealth | ★★☆☆☆ | ★★☆☆☆ | 낮음 | 기존 코드 활용, 은닉성 약함 |

### 15.2 권장 스택

```
Browser:    Camoufox (Firefox 기반, 엔진 수준 fingerprint)
CAPTCHA:    playwright-captcha (reCAPTCHA v2/v3, Cloudflare 지원)
Proxy:      Residential Proxy + geoip=True
인증:       persistent_context + user_data_dir (또는 쿠키 주입)
데이터:     Multi-selector fallback + GraphQL API 가로채기
행동:       humanize=True + 랜덤 2~5초 딜레이
```

### 15.3 선택 트리

```
Q: Firefox 기반 stealth가 필요한가?
  YES → Camoufox
  NO  → Q: Playwright 코드를 그대로 쓰고 싶은가?
    YES → Patchright
    NO  → Q: 가장 간단한 설치를 원하는가?
      YES → nodriver
      NO  → Playwright + playwright-stealth
```

## 16. What's Been Tried (업데이트)

- experiment: Patchright 조사 — Playwright 포크, 소스코드 패치로 stealth 내장
- lesson: Chromium 기반이므로 Firefox 기반(Camoufox)보다 탐지 위험 높음. Playwright-stealth보다는 나음. pip install로 간편 설치.
- experiment: playwright-captcha 조사 — camoufox-captcha의 후속, 활성 유지보수
- lesson: reCAPTCHA v2/v3, Cloudflare Turnstile, hCaptcha 지원. Camoufox 네이티브 지원. 무료 AI 해결 + 유료 서비스(2Captcha, CapSolver) 연동 가능.
- experiment: Bright Data Camoufox 가이드 분석 (2026)
- lesson: 엔진 수준 fingerprint 조작 vs JS injection 차이 확인. 대규모 스크래핑에서는 Scraping Browser/Web Unlocker 필요. Proxy 전략이 은닉성과 동등하게 중요.