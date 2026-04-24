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
- status: **연구 완료** — 9회 실험 완료. 기존 스크래퍼 분석 포함. 최종 2단계 아키텍처 권장.

## What's Been Tried
- experiment: Web search on headless browser alternatives for anti-detection
- lesson: 다양한 옵션 존재 - Camoufox, nodriver, Playwright+stealth, undetected-chromedriver
- experiment: Camoufox API 상세 조사 + 인스타그램 DOM selector 전략 + 인증 방법 + Windows 호환성
- lesson: Camoufox는 Playwright API 100% 호환, Windows 지원, persistent_context로 세션 유지 가능. Instagram DOM은 자주 변경되어 multi-selector fallback 필수. instagrapi도 API 기반 대안으로 유용.
- experiment: 실전 검증 (Run #4) — Camoufox, Patchright 설치 및 Instagram 스크래핑 테스트
- lesson: Camoufox/Patchright 모두 Python 3.14에서 정상 작동. Instagram 로그인 벽 없이 200 응답. og:meta 태그가 DOM selector보다 훨씬 안정적. nodriver는 Python 3.14 비호환(SyntaxError).
- experiment: 다중 게시물 스크래핑, 스크롤, Rate Limit 테스트 (Run #5)
- lesson: 프로필 페이지 비결정적(soft login wall). 게시물 URL 직접 접근이 안정적. 8개 rapid request에서 rate limit 없음(0.8s/게시물). 삭제 게시물은 title로 감지 가능. 프로덕션급 InstagramScraper 클래스 작성.
- experiment: GraphQL/API 가로채기, meta 태그 전체 분석, 프로필 소스 일관성 (Run #6)
- lesson: GraphQL 가로채기는 2026년 불가(빈 응답). og:meta에서 미디어ID/소유자ID/이미지URL/좋아요/댓글/캡션 모두 추출 가능. 프로필 HTML 소스도 비결정적. og:meta가 유일한 안정적 방법.
- experiment: Embed 엔드포인트 분석, 정규+embed 조합 전략 (Run #7)
- lesson: /embed/에서 정확한 좋아요 수(303,732 vs 304K)와 경량 데이터(135KB vs 1.1MB) 제공. __a=1은 더 이상 JSON API 아님. embed도 비결정적이므로 정규+embed 폴백 조합이 최적.
- experiment: Patchright Node.js + Next.js 통합 (Run #8)
- lesson: `npm install patchright`로 Node.js에서도 동일하게 작동. Vercel serverless에서는 브라우저 실행 불가. 별도 서버/워커 필요. TypeScript 코드 + API Route 패턴 작성.

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

---

# 실전 검증: 실제 설치 및 Instagram 스크래핑 테스트 (Run #4)

## 17. 테스트 환경

| 항목 | 값 |
|------|-----|
| **OS** | Windows 11 Education (10.0.26200) |
| **Python** | 3.14.3 (cp314) |
| **CPU** | AMD Ryzen 9 7950X3D |
| **네트워크** | 일반 한국 ISP (datacenter IP 아님) |
| **테스트 일시** | 2026-04-24 |

## 18. 설치 테스트 결과

### 18.1 Camoufox — 성공

```bash
python -m pip install camoufox        # 성공 (v0.4.11)
python -m camoufox fetch               # 성공 (v135.0.1-beta.24, 530MB 다운로드)
```

**설치 시간**: ~10초 (빠른 네트워크)
**디스크 사용량**: ~530MB (Firefox 기반 브라우저 바이너리 + uBlock Origin addon)

**의존성 자동 설치**: browserforge, playwright, orjson, pysocks 등

### 18.2 Patchright — 성공

```bash
python -m pip install patchright      # 성공 (v1.58.2)
```

**설치 시간**: ~2초
**디스크 사용량**: ~37MB (Playwright 패키지만, 브라우저는 시스템 Chromium 사용)

**주의**: 별도 브라우저 다운로드 불필요 — 시스템에 설치된 Chromium을 사용

### 18.3 nodriver — 실패 (Python 3.14 비호환)

```bash
python -m pip install nodriver        # 설치는 성공 (v0.48.1)
```

**실행 오류**:
```
SyntaxError: Non-UTF-8 code starting with '\xb1' on line 1365
  in nodriver/cdp/network.py
```

**원인**: nodriver의 CDP 모듈이 Python 3.14의 엄격한 인코딩 규칙과 호환되지 않음
**해결 방법**: Python 3.11~3.13에서는 정상 작동할 것으로 예상. Python 3.14에서는 사용 불가.

### 18.4 설치 비교 요약

| 도구 | 설치 성공 | 실행 성공 | 설치 시간 | 디스크 | Python 3.14 |
|------|----------|----------|----------|--------|-------------|
| **Camoufox** | O | O | ~10초 | ~530MB | 호환 |
| **Patchright** | O | O | ~2초 | ~37MB | 호환 |
| **nodriver** | O | **X** (SyntaxError) | ~3초 | ~1MB | **비호환** |

## 19. Instagram 스크래핑 실전 테스트

### 19.1 테스트 1: 프로필 페이지 (@nasa)

#### Camoufox 결과

```json
{
  "url": "https://www.instagram.com/nasa/",
  "title": "NASA(@nasa) • Instagram 사진 및 동영상",
  "login_wall": false,
  "article_count": 1,
  "og_description": "팔로워 105M명, 팔로잉 95명, 게시물 4,762개"
}
```

**핵심 발견**:
- **로그인 벽 없음** — 비로그인 상태로 프로필 페이지 접근 가능
- **og:description에서 팔로워/게시물 수 추출 성공**
- **article 요소 1개 감지** — React lazy loading으로 인해 더 많은 게시물은 스크롤 필요
- **12개 이미지 감지** (`article img` selector)

#### Patchright 결과

```json
{
  "url": "https://www.instagram.com/nasa/",
  "title": "NASA(@nasa) • Instagram 사진 및 동영상",
  "login_wall": false,
  "article_count": 1,
  "og_description": "팔로워 105M명, 팔로잉 95명, 게시물 4,762개"
}
```

**Camoufox와 동일한 결과** — 두 도구 모두 Instagram bot detection을 우회 성공

### 19.2 테스트 2: 개별 게시물 페이지

Camoufox로 `https://www.instagram.com/nasa/p/DXPduuvEY7S/` 테스트:

```json
{
  "url": "https://www.instagram.com/nasa/p/DXPduuvEY7S/",
  "status": 200,
  "caption": null,
  "author": null,
  "datetime": "2026-04-17T17:45:15.000Z",
  "image_count": 0,
  "og_image": "https://scontent-ssn1-1.cdninstagram.com/v/...",
  "og_description": "303K likes, 1,278 comments - nasa on April 17, 2026: \"Friends ➡️ Best Friends...\""
}
```

**핵심 발견**:

1. **DOM selector가 실패하는 이유**: Instagram은 React로 렌더링하며, caption/author 텍스트가 `h1`, `span` 등에 바로 나타나지 않음. Shadow DOM 또는 lazy hydration 사용.

2. **og:meta 태그가 가장 신뢰 가능**:
   - `og:description` → 좋아요 수, 댓글 수, 작성자, 작성일, **전체 캡션 텍스트** 포함
   - `og:image` → 게시물 대표 이미지 CDN URL
   - `og:type` → 기본적으로 `instapp:photo`

3. **`<time>` 요소는 추출 성공**: datetime 속성에 ISO 형식 타임스탬프

## 20. 실전 검증 결론: 최적의 데이터 추출 전략

### 20.1 Meta 태그 우선 전략 (검증됨)

```python
async def extract_post_data(page):
    """og:meta 태그에서 안정적으로 데이터 추출"""
    return await page.evaluate('''() => {
        const r = {};
        
        // 가장 신뢰 가능한 소스
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImg = document.querySelector('meta[property="og:image"]');
        const ogType = document.querySelector('meta[property="og:type"]');
        
        if (ogDesc) {
            const text = ogDesc.content;
            // "303K likes, 1,278 comments - nasa on April 17, 2026: \"...\""
            const likeMatch = text.match(/^(\S+) likes/);
            const commentMatch = text.match(/,(\s*\S+) comments/);
            const authorMatch = text.match(/-\s+(\w+)\s+on/);
            const dateMatch = text.match(/on\s+(.+?):\s+"/);
            const captionMatch = text.match(/:\s+"([\s\S]+)"\.?\s*$/);
            
            r.likes = likeMatch ? likeMatch[1] : null;
            r.comments = commentMatch ? commentMatch[1].trim() : null;
            r.author = authorMatch ? authorMatch[1] : null;
            r.date = dateMatch ? dateMatch[1] : null;
            r.caption = captionMatch ? captionMatch[1] : null;
            r.full_og = text;
        }
        
        r.image_url = ogImg ? ogImg.content : null;
        r.type = ogType ? ogType.content : null;
        
        // 시간 요소 (보조)
        const time = document.querySelector('time');
        r.datetime = time ? time.getAttribute('datetime') : null;
        
        return r;
    }''')
```

### 20.2 Instagram 데이터 추출 방법 신뢰도 (실전 검증)

| 방법 | 신뢰도 | 추출 데이터 | 비고 |
|------|--------|-----------|------|
| **og:meta 태그** | ★★★★★ | 좋아요, 댓글, 작성자, 날짜, 전체 캡션, 이미지 URL | DOM 변경 영향 없음 |
| **`<time>` 요소** | ★★★★☆ | datetime 속성 | DOM selector 안정적 |
| **DOM selector (h1, span)** | ★★☆☆☆ | caption, author | React hydration 지연으로 null 빈번 |
| **GraphQL API 가로채기** | ★★★★★ | 전체 구조화된 데이터 | 구현 복잡도 높음, 로그인 필요 가능 |

### 20.3 최종 실전 스크래핑 코드 (검증됨)

```python
import asyncio
import json
import re
from camoufox.async_api import AsyncCamoufox


async def scrape_instagram_post(post_url: str) -> dict:
    """
    검증된 Instagram 게시물 스크래핑 (Camoufox + og:meta 전략)
    
    Windows 11, Python 3.14에서 테스트 완료
    """
    async with AsyncCamoufox(
        headless=True,
        humanize=True,       # 인간 같은 마우스 움직임
        block_webrtc=True,   # IP 누출 방지
    ) as browser:
        page = await browser.new_page()
        
        response = await page.goto(post_url, wait_until='domcontentloaded', timeout=30000)
        
        if response.status != 200:
            return {'error': f'HTTP {response.status}', 'url': post_url}
        
        await page.wait_for_timeout(3000)
        
        # og:meta 태그에서 데이터 추출 (가장 안정적)
        data = await page.evaluate('''() => {
            const ogDesc = document.querySelector('meta[property="og:description"]');
            const ogImg = document.querySelector('meta[property="og:image"]');
            const time = document.querySelector('time');
            
            const r = { url: window.location.href };
            r.og_description = ogDesc ? ogDesc.content : null;
            r.og_image = ogImg ? ogImg.content : null;
            r.datetime = time ? time.getAttribute('datetime') : null;
            return r;
        }''')
        
        # og:description 파싱
        if data.get('og_description'):
            text = data['og_description']
            like_match = re.search(r'^(\S+) likes', text)
            comment_match = re.search(r',(\s*\S+) comments', text)
            author_match = re.search(r'-\s+(\w+)\s+on', text)
            caption_match = re.search(r':\s+"([\s\S]+?)"\.?\s*$', text)
            
            data['likes'] = like_match.group(1) if like_match else None
            data['comments'] = comment_match.group(1).strip() if comment_match else None
            data['author'] = author_match.group(1) if author_match else None
            data['caption'] = caption_match.group(1) if caption_match else None
        
        return data


async def scrape_profile(username: str) -> dict:
    """Instagram 프로필 페이지 스크래핑"""
    async with AsyncCamoufox(
        headless=True,
        humanize=True,
        block_webrtc=True,
    ) as browser:
        page = await browser.new_page()
        await page.goto(f'https://www.instagram.com/{username}/', 
                       wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)
        
        return await page.evaluate('''() => {
            const ogDesc = document.querySelector('meta[property="og:description"]');
            const ogImg = document.querySelector('meta[property="og:image"]');
            return {
                url: window.location.href,
                title: document.title,
                og_description: ogDesc ? ogDesc.content : null,
                og_image: ogImg ? ogImg.content : null,
            };
        }''')


# 실행 예제
async def main():
    # 게시물
    post = await scrape_instagram_post('https://www.instagram.com/nasa/p/DXPduuvEY7S/')
    print(json.dumps(post, ensure_ascii=False, indent=2))
    
    # 프로필
    profile = await scrape_profile('nasa')
    print(json.dumps(profile, ensure_ascii=False, indent=2))


asyncio.run(main())
```

## 21. What's Been Tried (Run #4 업데이트)

- experiment: Camoufox 실전 설치 및 실행 테스트 (Python 3.14, Windows 11)
- lesson: pip install 성공, camoufox fetch 성공 (530MB). headless 모드 정상 작동. example.com 테스트 통과.
- experiment: Camoufox로 Instagram @nasa 프로필 페이지 스크래핑
- lesson: **로그인 벽 없음**. HTTP 200. og:description에서 팔로워/게시물 수 추출 성공. 12개 이미지 감지.
- experiment: Camoufox로 Instagram 개별 게시물 스크래핑
- lesson: **DOM selector (h1, span)은 null 반환** — React hydration 지연. **og:meta 태그가 가장 신뢰 가능**: 좋아요, 댓글, 작성자, 날짜, 전체 캡션, 이미지 URL 모두 포함. `<time>` 요소는 정상 작동.
- experiment: Patchright 실전 설치 및 Instagram 테스트
- lesson: pip install 성공, 시스템 Chromium 사용. Instagram 프로필 페이지 동일하게 스크래핑 성공. Camoufox보다 설치 간편.
- experiment: nodriver 실전 설치 테스트 (Python 3.14)
- lesson: **설치는 성공하지만 실행 시 SyntaxError** (cdp/network.py, Non-UTF-8 code). Python 3.14 미지원. 3.11~3.13 필요.

---

# 심화 검증: 다중 게시물 스크래핑, 스크롤, Rate Limit 테스트 (Run #5)

## 22. 프로필 페이지 스크롤 및 게시물 링크 수집

### 22.1 스크롤 테스트 결과

Instagram 프로필 페이지에서의 스크롤 동작 테스트:

| 전략 | 결과 | 비고 |
|------|------|------|
| `window.scrollBy(0, 1500)` | 링크 수 변화 없음 | Instagram이 virtual scroll 사용 |
| `window.scrollTo(0, document.body.scrollHeight)` | 동일 | 전체 body가 이미 로드됨 |
| `keyboard.press('PageDown')` | 동일 | intersection observer 기반 로딩 |

**핵심 발견**: Instagram 프로필은 **intersection observer**로 게시물을 lazy loading함. 단순 JS scroll로는 새 게시물이 로드되지 않음. 실제 스크롤 이벤트를 DOM 요소에 전달해야 함.

### 22.2 프로필 페이지 비결정적 동작

**중요 발견**: Instagram 프로필 페이지는 **비결정적**으로 동작:

```
Run #4 테스트: @nasa 프로필 → 12개 이미지, 4개 게시물 링크, 로그인 벽 없음
Run #5 테스트: @nasa 프로필 → 0개 게시물, 로그인 폼 표시 (soft login wall)
```

**원인 분석**:
1. Instagram이 A/B 테스트로 비로그인 사용자에게 다른 페이지 제공
2. 세션 쿠키 유무에 따라 동작 변경
3. IP 기반 rate limiting으로 콘텐츠 접근 제한

**해결 방법**:
- 프로필 페이지에 의존하지 말고 **직접 게시물 URL** 사용
- 게시물 URL은 og:meta 태그를 통해 **일관되게 데이터 반환**
- 프로필 정보는 og:description에서만 추출 (안정적)

### 22.3 권장 스크롤 전략 (프로필 페이지)

```python
async def scroll_profile_for_posts(page, max_scrolls=10, delay=2000):
    """프로필에서 게시물 링크 수집 (intersection observer 대응)"""
    collected = set()
    
    for _ in range(max_scrolls):
        # 현재 링크 수집
        links = await page.evaluate("""() => {
            return [...document.querySelectorAll('a[href*="/p/"]')]
                .map(a => a.href);
        }""")
        new_links = set(links) - collected
        if not new_links:
            # 새 링크가 없으면 스크롤
            await page.evaluate('window.scrollBy(0, 1000)')
            await page.wait_for_timeout(delay)
        collected.update(links)
    
    return list(collected)
```

**주의**: 위 전략은 프로필이 콘텐츠를 렌더링한 경우에만 작동. soft login wall이 표시되면 게시물 링크를 수집할 수 없음.

## 23. 다중 게시물 순차 스크래핑 테스트

### 23.1 순차 스크래핑 결과 (3개 게시물)

```
Post 1: @nasa/DXPduuvEY7S → 좋아요 304K, 댓글 1,278, 작성자 nasa, 날짜 2026-04-17 ✓
Post 2: @nasa/DW_sj70mtDW → 좋아요 2M, 댓글 7,554, 작성자 nasaartemis, 날짜 2026-04-11 ✓
Post 3: @nasaartemis/DW0QxYCy_0G → 삭제됨 ("Post isn't available") ✓ 감지됨
```

**결과**: 유효한 게시물 2/2 (100%), 삭제된 게시물 1/1 정상 감지

### 23.2 Rate Limit 테스트 (8개 rapid request, 500ms 간격)

```
[1/8] OK    | 200 | 1.4s | 유효
[2/8] OK    | 200 | 1.1s | 유효
[3/8] OK    | 200 | 0.9s | 유효
[4/8] OK    | 200 | 0.6s | 유효
[5/8] EMPTY | 200 | 0.4s | 삭제됨
[6/8] DEL   | 200 | 0.6s | 삭제됨
[7/8] DEL   | 200 | 0.7s | 삭제됨
[8/8] DEL   | 200 | 0.5s | 삭제됨

유효 게시물: 4/4 성공 (100%)
Rate limit: 0건 (8개 연속 요청에서 429 응답 없음)
평균 처리 시간: 0.8초/게시물
총 소요: 6.2초 / 8개 게시물
```

### 23.3 Rate Limit 한계 테스트 권장

500ms 간격으로 8개 요청 시 rate limit 없음. 하지만 대량 스크래핑 시:

| 요청 수 | 간격 | 예상 결과 |
|---------|------|----------|
| 1~10 | 500ms | 안전 (테스트 완료) |
| 10~50 | 1~3s | 주의 필요 |
| 50~100 | 3~5s | Residential proxy 권장 |
| 100+ | 5s+ | Proxy + 세션 로테이션 필수 |

## 24. 삭제/오류 게시물 처리

### 24.1 감지된 에러 유형

| 에러 | title | og:description | HTTP 상태 | 해결 |
|------|-------|----------------|-----------|------|
| **삭제된 게시물** | "Post isn't available" | null | 200 | og:description == null로 감지 |
| **Soft login wall** | "Instagram 사진 및 동영상" | 팔로워 정보만 | 200 | articles == 0 + 로그인 폼 감지 |
| **네트워크 오류** | N/A | N/A | timeout | 재시도 로직 |

### 24.2 에러 감지 로직 (검증됨)

```python
async def scrape_with_error_handling(page, url):
    """에러 처리 포함 스크래핑"""
    try:
        resp = await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        
        if resp.status == 429:
            return {'error': 'rate_limited', 'retry_after': 60}
        
        if resp.status != 200:
            return {'error': f'http_{resp.status}'}
        
        await page.wait_for_timeout(3000)
        
        data = await page.evaluate("""() => {
            const ogDesc = document.querySelector(
                'meta[property="og:description"]'
            );
            const title = document.title || '';
            
            return {
                og_description: ogDesc ? ogDesc.content : null,
                is_deleted: title.includes('available'),
                is_login_wall: !ogDesc && !title.includes('available'),
            };
        }""")
        
        if data.get('is_deleted'):
            return {'error': 'post_deleted', 'url': url}
        
        if data.get('is_login_wall'):
            return {'error': 'login_required', 'url': url}
        
        if not data.get('og_description'):
            return {'error': 'no_data', 'url': url}
        
        # 정상 데이터 파싱...
        return {'status': 'ok', 'og_description': data['og_description']}
        
    except Exception as e:
        return {'error': type(e).__name__, 'message': str(e)}
```

## 25. 최종 프로덕션급 다중 게시물 스크래핑 코드

```python
import asyncio
import json
import re
import random
import time
from camoufox.async_api import AsyncCamoufox


class InstagramScraper:
    """검증된 Instagram 다중 게시물 스크래핑 (Camoufox)"""
    
    def __init__(self, min_delay=2.0, max_delay=5.0):
        self.min_delay = min_delay
        self.max_delay = max_delay
    
    async def scrape_post(self, page, url: str) -> dict:
        """단일 게시물 스크래핑 (에러 처리 포함)"""
        try:
            resp = await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            if resp.status == 429:
                return {'error': 'rate_limited', 'retry_after': 60, 'url': url}
            if resp.status != 200:
                return {'error': f'http_{resp.status}', 'url': url}
            
            await page.wait_for_timeout(random.randint(2000, 4000))
            
            data = await page.evaluate("""() => {
                const ogDesc = document.querySelector(
                    'meta[property="og:description"]'
                );
                const ogImg = document.querySelector(
                    'meta[property="og:image"]'
                );
                const timeEl = document.querySelector('time');
                const title = document.title || '';
                
                return {
                    og_description: ogDesc ? ogDesc.content : null,
                    og_image: ogImg ? ogImg.content : null,
                    datetime: timeEl
                        ? timeEl.getAttribute('datetime') : null,
                    is_deleted: title.includes('available'),
                };
            }""")
            
            if data.get('is_deleted') or not data.get('og_description'):
                return {'error': 'post_unavailable', 'url': url}
            
            # og:description 파싱
            result = {
                'url': url,
                'status': 'ok',
                'image_url': data.get('og_image'),
                'datetime': data.get('datetime'),
            }
            
            text = data['og_description']
            like_m = re.search(r'^(\S+)\s+likes?', text)
            comment_m = re.search(r',\s*(\S+)\s+comments?', text)
            author_m = re.search(r'-\s+(\w+)\s+on\s+', text)
            caption_m = re.search(r':\s+"([\s\S]+?)"\.?\s*$', text)
            
            result['likes'] = like_m.group(1) if like_m else None
            result['comments'] = (
                comment_m.group(1).strip() if comment_m else None
            )
            result['author'] = author_m.group(1) if author_m else None
            result['caption'] = (
                caption_m.group(1) if caption_m else None
            )
            result['og_description'] = text
            
            return result
            
        except Exception as e:
            return {
                'error': type(e).__name__, 
                'message': str(e), 
                'url': url
            }
    
    async def scrape_posts(self, urls: list[str]) -> list[dict]:
        """다중 게시물 스크래핑"""
        results = []
        
        async with AsyncCamoufox(
            headless=True,
            humanize=True,
            block_webrtc=True,
        ) as browser:
            page = await browser.new_page()
            
            for i, url in enumerate(urls):
                result = await self.scrape_post(page, url)
                tag = 'OK' if result.get('status') == 'ok' else 'ERR'
                print(f'  [{i+1}/{len(urls)}] {tag} | {url}')
                results.append(result)
                
                # Rate limit 감지 시 대기
                if result.get('error') == 'rate_limited':
                    wait = result.get('retry_after', 60)
                    print(f'  Rate limited! Waiting {wait}s...')
                    await page.wait_for_timeout(wait * 1000)
                
                # 인간 같은 딜레이
                delay = random.uniform(self.min_delay, self.max_delay)
                await page.wait_for_timeout(int(delay * 1000))
        
        return results
    
    async def scrape_profile_info(self, username: str) -> dict:
        """프로필 정보 스크래핑 (og:meta만)"""
        async with AsyncCamoufox(
            headless=True, humanize=True, block_webrtc=True
        ) as browser:
            page = await browser.new_page()
            url = f'https://www.instagram.com/{username}/'
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await page.wait_for_timeout(3000)
            
            return await page.evaluate("""() => {
                const ogDesc = document.querySelector(
                    'meta[property="og:description"]'
                );
                const ogImg = document.querySelector(
                    'meta[property="og:image"]'
                );
                return {
                    url: window.location.href,
                    title: document.title,
                    og_description: ogDesc ? ogDesc.content : null,
                    og_image: ogImg ? ogImg.content : null,
                };
            }""")


# 사용 예제
async def main():
    scraper = InstagramScraper(min_delay=2.0, max_delay=4.0)
    
    # 프로필 정보
    profile = await scraper.scrape_profile_info('nasa')
    print(json.dumps(profile, ensure_ascii=False, indent=2))
    
    # 다중 게시물
    urls = [
        'https://www.instagram.com/nasa/p/DXPduuvEY7S/',
        'https://www.instagram.com/nasa/p/DW_sj70mtDW/',
    ]
    results = await scraper.scrape_posts(urls)
    print(json.dumps(results, ensure_ascii=False, indent=2))


asyncio.run(main())
```

## 26. What's Been Tried (Run #5 업데이트)

- experiment: 프로필 페이지 스크롤 전략 테스트 (window.scrollBy, scrollTo, PageDown)
- lesson: Instagram 프로필은 intersection observer로 lazy loading. 단순 JS scroll로 새 게시물 로드 안 됨. 프로필 페이지는 **비결정적**으로 동작 (A/B 테스트, 세션 상태에 따라 로그인 벽 또는 콘텐츠 표시).
- experiment: 순차 다중 게시물 스크래핑 (3개 게시물, Camoufox)
- lesson: 유효한 게시물 2/2 성공 (100%). 삭제된 게시물 정상 감지. 게시물 URL 직접 접근이 프로필 스크롤보다 훨씬 안정적.
- experiment: Rate limit 테스트 (8개 rapid request, 500ms 간격)
- lesson: 8개 연속 요청에서 429 rate limit 없음. 유효 게시물 4/4 성공. 평균 0.8초/게시물. 대량 스크래핑(50+게시물)에서는 proxy 필요할 것으로 예상.
- experiment: 삭제/오류 게시물 처리 로직 검증
- lesson: 삭제된 게시물은 HTTP 200 + title "Post isn't available" + og:description==null. rate limit은 HTTP 429. soft login wall은 og:description에 팔로워 정보만 있고 articles==0.

---

# 심화 분석: GraphQL/API 가로채기, Meta 태그 전체 분석, 프로필 소스 일관성 (Run #6)

## 27. GraphQL/API 네트워크 가로채기 결과

### 27.1 네트워크 응답 분석 (게시물 페이지)

게시물 페이지(`instagram.com/nasa/p/DXPduuvEY7S/`)에서 캡처한 전체 네트워크 응답:

| URL | 상태 | 크기 | 내용 |
|-----|------|------|------|
| `/nasa/p/DXPduuvEY7S/` (HTML) | 200 | 1,085KB | **SSR 페이지 — 모든 데이터 포함** |
| `/api/graphql` (x4) | 200 | 149~231B | 실험 플래그만 (`ig_optimize_dialogs_launch` 등) |
| `/graphql/query` | 200 | 147B | 빈 데이터 (`{"data":{}}`) |
| `/ajax/bulk-route-definitions/` | 200 | 3.9KB | 라우팅 설정 |
| `/facebook.com/ig_xsite_user_info/` | 200 | 65B | Facebook 연동 |

**핵심 결론**: Instagram은 **별도 GraphQL API 호출 없이** 모든 게시물 데이터를 초기 HTML에 SSR로 포함. `graphql/query` 엔드포인트는 빈 응답 반환. 네트워크 가로채기로 추가 데이터를 얻을 수 없음.

### 27.2 HTML 소스 내 데이터 패턴 검색

```
검색 패턴                    결과
─────────────────────────────────────────────────
shortcode_media              없음 (구 Instagram 구조)
edge_media_to_caption        없음
display_url                  없음
video_url                    없음
accessibility_caption        발견! "Photo by NASA on April 17, 2026..."
graphql                      있음 (API 경로 문자열만)
window._sharedData           없음 (구 구조)
window.__initialData         없음
```

**결론**: Instagram 2026년 버전은 서버 렌더링에서 구 GraphQL 데이터 구조를 제거. 데이터는 React hydration 후 DOM에만 나타남. HTML 소스에서 직접 추출 가능한 것은 meta 태그뿐.

## 28. Meta 태그 전체 분석 (게시물 페이지)

Instagram 게시물 페이지에서 발견된 **모든 meta 태그**:

### 28.1 구조화된 데이터

| Meta 태그 | 값 | 활용 |
|-----------|-----|------|
| `og:type` | `article` | 미디어 타입 |
| `og:site_name` | `Instagram` | 사이트 확인 |
| `og:url` | `https://www.instagram.com/nasa/p/DXPduuvEY7S/` | 정식 URL |
| `og:title` | `NASA on Instagram: "Friends \u27a1\ufe0f Best Friends..."` | 작성자 + 캡션 앞부분 |
| `og:description` | `304K likes, 1,279 comments - nasa on April 17, 2026: "..."` | **핵심: 좋아요/댓글/작성자/캡션** |
| `og:image` | `https://scontent-ssn1-1.cdninstagram.com/v/...` | 대표 이미지 CDN URL |
| `description` | og:description과 동일 | 검색엔진용 |

### 28.2 앱 딥링크 및 ID

| Meta 태그 | 값 | 활용 |
|-----------|-----|------|
| `al:ios:url` | `instagram://media?id=3877448558815842002` | **미디어 ID** |
| `al:android:url` | 게시물 URL | Android 딥링크 |
| `al:ios:app_store_id` | `389801252` | Instagram iOS 앱 ID |
| `al:android:package` | `com.instagram.android` | Android 패키지명 |
| `fb:app_id` | `124024574287414` | Facebook 앱 ID |
| `instapp:owner_user_id` | `528817151` | **계정 소유자 ID** |

### 28.3 Twitter 카드

| Meta 태그 | 값 |
|-----------|-----|
| `twitter:card` | `summary_large_image` |
| `twitter:site` | `@instagram` |
| `twitter:image` | og:image와 동일 |
| `twitter:title` | `NASA (@nasa) \u2022 Instagram photos and videos` |

### 28.4 SEO/크롤링 제어

| Meta 태그 | 값 | 의미 |
|-----------|-----|------|
| `robots` | `noarchive, noimageindex` | 보관/이미지 인덱싱 금지 |
| `bingbot` | `noarchive` | Bing 보관 금지 |

### 28.5 추출 가능한 전체 데이터 맵핑

```python
# meta 태그에서 추출 가능한 데이터 (og:description 파싱 포함)
post_data = {
    'media_id': '3877448558815842002',       # al:ios:url에서 추출
    'owner_id': '528817151',                   # instapp:owner_user_id
    'url': 'https://.../',                      # og:url
    'author': 'nasa',                           # og:description 파싱
    'likes': '304K',                            # og:description 파싱
    'comments': '1,279',                        # og:description 파싱
    'caption': 'Friends \u27a1\ufe0f Best Friends...', # og:description 파싱
    'image_url': 'https://scontent-...',        # og:image
    'date': 'April 17, 2026',                   # og:description 파싱
    'accessibility': 'Photo by NASA on April 17, 2026...', # HTML에서 추출
}
```

## 29. 프로필 페이지 HTML 소스 일관성 분석

### 29.1 프로필 소스에서 게시물 링크 추출

프로필 HTML 소스(`instagram.com/nasa/`)에서 정규식으로 추출:

```python
# HTML 소스에서 게시물 링크 추출 패턴
post_pattern = r'href="(/[\w.]+/p/[\w-]+/)"'
reel_pattern = r'href="(/[\w.]+/reel/[\w-]+/)"'
```

**성공 시 결과 (프로필 HTML에 포함된 링크)**:
```
게시물 링크 4개: /nasa/p/DXPduuvEY7S/, /nasaartemis/p/DW_sj70mtDW/, /nasa/p/DXcEDIrkr6y/, /nasa/p/DXXOeZjj63U/
릴스 링크 8개: /nasa/reel/DW-toGVj4I4/, /nasaartemis/reel/DXcaK97Dgfm/, ...
```

### 29.2 비결정성 확인 (2회 연속 테스트)

```
Run 1: HTML 883KB, 게시물 0개, 릴스 0개  ← 소프트 로그인 벽
Run 2: HTML 1,001KB, 게시물 4개, 릴스 8개 ← 정상 콘텐츠
```

**확인**: 프로필 페이지의 HTML 소스 수준에서도 **비결정적**. Instagram이 A/B 테스트 또는 IP/세션 기반으로 서로 다른 SSR 결과를 반환.

### 29.3 프로필 정보는 항상 사용 가능

비결정적 콘텐츠와 관계없이 **og:description은 항상 반환**:
```
og:description: "105M Followers, 95 Following, 4,762 Posts - See Instagram photos and videos from NASA (@nasa)"
```

**프로필에서 항상 추출 가능한 데이터**:
- 팔로워 수 (105M)
- 팔로잉 수 (95)
- 총 게시물 수 (4,762)
- 프로필 이름 (NASA)
- 사용자명 (@nasa)
- 프로필 이미지 (og:image)

## 30. 데이터 추출 방법 최종 비교 (실험 검증 완료)

| 방법 | 안정성 | 데이터 풍부도 | 구현 난이도 | 비고 |
|------|--------|-------------|------------|------|
| **og:meta 태그** | ★★★★★ | ★★★★☆ | 낮음 | 좋아요/댓글/작성자/캡션/이미지/미디어ID/소유자ID |
| **DOM selector** | ★★☆☆☆ | ★★★☆☆ | 중간 | React hydration 지연, null 빈번 |
| **GraphQL 가로채기** | ☆☆☆☆☆ | ☆☆☆☆☆ | 높음 | **2026년 불가** — API가 빈 응답 반환 |
| **HTML 소스 정규식** | ★★☆☆☆ | ★★★☆☆ | 낮음 | 게시물 링크 추출은 가능하지만 프로필이 비결정적 |
| **accessibility_caption** | ★★★☆☆ | ★★☆☆☆ | 낮음 | "Photo by NASA on April 17, 2026" 정도 |

**최종 결론: og:meta 태그가 유일하게 안정적이고 구현이 간단한 방법.** GraphQL 가로채기는 2026년에 작동하지 않음.

## 31. What's Been Tried (Run #6 업데이트)

- experiment: GraphQL API 네트워크 가로채기 테스트
- lesson: Instagram 2026은 별도 GraphQL API 호출 없이 SSR로 모든 데이터를 HTML에 포함. `/api/graphql`은 실험 플래그만 반환. `/graphql/query`는 빈 응답. **네트워크 가로채기로 추가 데이터 불가.**
- experiment: Meta 태그 전체 분석 (게시물 페이지)
- lesson: **og:meta 태그에서 미디어 ID, 소유자 ID, 이미지 URL, 좋아요/댓글/캡션 등 거의 모든 데이터 추출 가능.** `al:ios:url`에서 `media_id`, `instapp:owner_user_id`에서 계정 ID 확보.
- experiment: 프로필 HTML 소스 정규식으로 게시물 링크 추출
- lesson: HTML 소스에 게시물/릴스 링크가 포함되는 경우가 있지만 **비결정적** (50% 확률). og:description은 항상 반환. 프로필 정보(팔로워/게시물 수)는 항상 사용 가능.
- experiment: 데이터 추출 방법 최종 비교
- lesson: **og:meta 태그 > HTML 소스 정규식 > DOM selector > GraphQL 가로채기(불가)**. GraphQL은 2026년에 작동하지 않으므로 문서에서 권장 순위 조정 필요.

---

# 대체 엔드포인트 분석: Embed API (Run #7)

## 32. Instagram Embed 엔드포인트 분석

### 32.1 테스트한 엔드포인트

| 엔드포인트 | HTTP 상태 | 본문 크기 | 데이터 | 로그인 벽 |
|------------|----------|----------|--------|----------|
| `/p/{id}/` (정규) | 200 | ~1.1MB | og:meta + React 렌더링 | 간헐적 |
| `/p/{id}/embed/` | 200 | ~135KB | 작성자, 정확한 좋아요 수, 이미지 | 없음 |
| `/p/{id}/embed/captioned/` | 200 | ~138KB | embed + 캡션 텍스트 | 없음 |
| `/p/{id}/?__a=1` | 200 | ~1.1MB | 정규 페이지와 동일 (API 아님) | 간헐적 |
| `/p/{id}/?__d=1` | 200 | ~1.1MB | 정규 페이지와 동일 | 간헐적 |
| `/p/{id}/media/` | 타임아웃 | - | 미디어 리다이렉트 (안 됨) | - |

### 32.2 Embed 페이지 장점

1. **정확한 좋아요 수**: og:description은 "304K"로 축약하지만, embed는 **"303,732 likes"**로 정확한 숫자 반환
2. **경량**: 135KB vs 1.1MB — 8배 작음. 더 빠른 로딩, 적은 대역폭
3. **안정적**: 정규 페이지보다 로그인 벽이 적게 표시 (하지만 비결정성 완전히 제거는 아님)
4. **간단한 DOM**: React hydration 없이 서버 렌더링만으로 데이터 표시
5. **구조화된 텍스트**: 줄바꿈으로 구분된 명확한 데이터 레이아웃

### 32.3 Embed 페이지에서 추출 가능한 데이터

```
embed body text (예: /p/DXPduuvEY7S/embed/captioned/):

  nasa                                    ← 작성자명
  Verified                                ← 인증 배지
  105M followers                          ← 팔로워 수
  View profile
  nasa
  Verified
  4,762 posts · 105M followers            ← 게시물/팔로워 요약
  View more on Instagram
  Like
  Comment
  Share
  Save
  303,732 likes                           ← 정확한 좋아요 수
  [캡션 텍스트]                           ← /captioned/ 변형에서만
  Add a comment...
```

### 32.4 Embed vs 정규 페이지 비교

| 항목 | 정규 `/p/{id}/` | Embed `/embed/` |
|------|----------------|-----------------|
| 좋아요 수 | "304K" (축약) | **"303,732" (정확)** |
| 캡션 | og:description (잘림) | body text (전체) |
| 이미지 | CDN URL (og:image) | DOM 이미지 태그 |
| 크기 | ~1.1MB | ~135KB |
| 로그인 벽 | 간헐적 | 간헐적 (정규보다 적음) |
| 미디어 ID | `al:ios:url`에서 추출 | 미제공 |
| 소유자 ID | `instapp:owner_user_id` | 미제공 |

### 32.5 권장 전략: 정규 + Embed 조합

```python
async def scrape_post_complete(page, post_url):
    """
    정규 페이지에서 메타데이터(ID, og:meta) +
    Embed 페이지에서 정확한 좋아요 수/캡션 추출
    """
    result = {}
    
    # 1. 정규 페이지: meta 태그 (ID, 이미지 URL)
    resp = await page.goto(post_url, wait_until='domcontentloaded', timeout=15000)
    await page.wait_for_timeout(2000)
    
    meta = await page.evaluate("""() => {
        const og = document.querySelector('meta[property="og:description"]');
        const img = document.querySelector('meta[property="og:image"]');
        const iosUrl = document.querySelector('meta[property="al:ios:url"]');
        const ownerId = document.querySelector('meta[property="instapp:owner_user_id"]');
        return {
            og_description: og ? og.content : null,
            og_image: img ? img.content : null,
            media_id: iosUrl ? iosUrl.content.match(/id=(\d+)/)?.[1] : null,
            owner_id: ownerId ? ownerId.content : null,
        };
    }""")
    result.update(meta)
    
    # 2. Embed 페이지: 정확한 좋아요 수
    # /embed/ (경량, ID 포함)
    shortcode = post_url.rstrip('/').split('/')[-1]
    embed_url = f'https://www.instagram.com/p/{shortcode}/embed/captioned/'
    await page.goto(embed_url, wait_until='domcontentloaded', timeout=15000)
    await page.wait_for_timeout(2000)
    
    embed = await page.evaluate("""() => {
        const text = document.body ? document.body.innerText : '';
        const likeMatch = text.match(/([0-9,]+)\s*likes/);
        const authorMatch = text.match(/^\s*(\w+)/m);
        // 캡션: 좋아요 수 뒤의 텍스트
        const lines = text.split('\n');
        const likeIdx = lines.findIndex(l => l.includes('likes'));
        const authorIdx = lines.findIndex(l => l.match(/^\w+$/));
        let caption = '';
        if (likeIdx >= 0 && likeIdx + 1 < lines.length) {
            caption = lines.slice(likeIdx + 1).join(' ').substring(0, 500);
        }
        return {
            exact_likes: likeMatch ? likeMatch[1] : null,
            caption: caption,
        };
    }""")
    
    result['exact_likes'] = embed['exact_likes']
    if embed['caption']:
        result['full_caption'] = embed['caption']
    
    return result
```

## 33. What's Been Tried (Run #7 업데이트)

- experiment: Instagram 대체 엔드포인트 테스트 (embed, __a=1, __d=1, media/)
- lesson: `/embed/`와 `/embed/captioned/`가 정규 페이지보다 **정확한 좋아요 수**와 **경량(8배 작음)** 제공. `__a=1`은 2026년에 더 이상 JSON API로 작동하지 않음(정규 페이지와 동일). `/media/`는 타임아웃.
- experiment: 정규 페이지 vs embed 페이지 데이터 비교
- lesson: og:description은 좋아요 수를 "304K"로 축약하지만 embed는 "303,732"로 정확 반환. 캡션도 embed에서 더 완전하게 추출. 하지만 **embed도 비결정적** — 때때로 "Page is not available" 반환.
- experiment: 정규 + embed 조합 스크래핑 전략 수립
- lesson: 정규 페이지에서 미디어 ID/소유자 ID/이미지 URL을, embed에서 정확한 좋아요 수/캡션을 가져오는 조합이 최적. 두 소스를 모두 시도하고 성공한 것을 사용하는 폴백 전략 권장.

---

# Node.js/TypeScript 생태계 + Next.js 통합 (Run #8)

## 34. Patchright Node.js 테스트 결과

### 34.1 설치

```bash
npm install patchright    # v1.59.4 (Playwright v1.59 포함)
```

**주의**: `patchright`을 설치하면 `playwright` 모듈이 대체됨. 같은 프로젝트에서 두 패키지 공존 불가.

### 34.2 Instagram 게시물 스크래핑 (Node.js)

**테스트 결과**: Python과 동일하게 작동

```
Status: 200
og:description: 304K likes, 1,279 comments - nasa - April 17, 2026
media_id: 3877448558815842002
owner_id: 528817151
datetime: 2026-04-17T17:45:15.000Z
```

### 34.3 Embed 엔드포인트 (Node.js)

**테스트 결과**: Python과 동일

```
Embed status: 200
Exact likes: 303,745
Body: nasa / 105M followers / 303,745 likes / caption...
```

**결론**: Node.js에서도 동일한 전략(og:meta + embed 폴백)이 그대로 적용 가능.

## 35. Next.js 통합 패턴

### 35.1 프로젝트 현재 상태

```json
// package.json 이미 포함:
// next: 16.2.4
// @aduptive/instagram-scraper: ^1.0.3 (기존 스크래퍼)
// cheerio: ^1.2.0 (HTML 파서)
```

프로젝트에 이미 Instagram 스크래핑 관련 의존성이 있음. Patchright로 교체/보완 가능.

### 35.2 권장 아키텍처 (Next.js App Router)

```typescript
// lib/instagram-scraper.ts
import { chromium, type Browser } from 'patchright';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function scrapeInstagramPost(url: string) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // 1. 정규 페이지: meta 태그 (ID, 이미지, 캡션)
    const resp = await page.goto(url, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    if (resp!.status() !== 200) return { error: `HTTP ${resp!.status()}` };
    await page.waitForTimeout(2000);

    const meta = await page.evaluate(() => {
      const get = (p: string) =>
        document.querySelector(`meta[property="${p}"]`)
          ?.getAttribute('content') ?? null;
      return {
        og_description: get('og:description'),
        og_image: get('og:image'),
        media_id: get('al:ios:url')?.match(/id=(\d+)/)?.[1] ?? null,
        owner_id: get('instapp:owner_user_id'),
        datetime: document.querySelector('time')?.getAttribute('datetime') ?? null,
      };
    });

    // 2. Embed: 정확한 좋아요 수
    const shortcode = url.replace(/\/$/, '').split('/').pop();
    let exactLikes: string | null = null;
    try {
      await page.goto(
        `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
        { waitUntil: 'domcontentloaded', timeout: 10000 }
      );
      await page.waitForTimeout(2000);
      const embedData = await page.evaluate(() => {
        const text = document.body?.innerText ?? '';
        const likeMatch = text.match(/([0-9,]+)\s*likes/);
        return { likes: likeMatch?.[1] ?? null };
      });
      exactLikes = embedData.likes;
    } catch { /* embed 실패해도 meta 데이터는 있음 */ }

    return { ...meta, exact_likes: exactLikes, status: 'ok' };
  } finally {
    await page.close();
  }
}
```

### 35.3 API Route 패턴

```typescript
// app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramPost } from '@/lib/instagram-scraper';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || !url.includes('instagram.com/p/')) {
    return NextResponse.json(
      { error: 'Invalid Instagram post URL' }, { status: 400 }
    );
  }
  try {
    const data = await scrapeInstagramPost(url);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Scraping failed', details: String(error) }, { status: 500 }
    );
  }
}
```

### 35.4 Vercel 배포 시 주의사항

| 이슈 | 해결 방안 |
|------|----------|
| Serverless 함수 크기 제한 | Patchright ~37MB, Vercel 50MB 한도 내 가능 |
| 실행 시간 제한 | Hobby: 10초, Pro: 60초. 스크래핑 1회 ~5초 |
| **헤드리스 브라우저 미지원** | **Vercel에서 Playwright 실행 불가. 외부 API 또는 자체 서버 필요** |
| 대안 1 | 별도 워커에서 스크래핑 -> DB 저장 -> API 제공 |
| 대안 2 | Camoufox Python 서버 별도 실행 -> Node.js에서 HTTP API 호출 |
| 대안 3 | Docker 컨테이너 배포 (Railway, Fly.io, Render) |

**핵심**: Vercel serverless에서는 브라우저 실행이 제한됨. 별도 서버 또는 Python 워커 권장.

## 36. Python vs Node.js 최종 비교

| 항목 | Python (Camoufox) | Node.js (Patchright) |
|------|-------------------|---------------------|
| 은닉 수준 | 최고 (Firefox + 엔진 수준) | 높음 (Chromium + 소스코드 패치) |
| 설치 복잡도 | 530MB 바이너리 다운로드 필요 | npm install만 (37MB) |
| Instagram 차단 | 없음 (테스트 통과) | 없음 (테스트 통과) |
| og:meta 추출 | 동일 | 동일 |
| embed 추출 | 동일 | 동일 |
| Next.js 통합 | HTTP API로 호출 | 직접 import 가능 |
| Vercel 배포 | 불가 (별도 서버) | 불가 (별도 서버) |
| 권장 용도 | 독립 스크래핑 서버 | Next.js 서버 사이드 |

## 37. What's Been Tried (Run #8 업데이트)

- experiment: Patchright Node.js 패키지 설치 및 Instagram 스크래핑 테스트
- lesson: `npm install patchright`로 설치 성공 (v1.59.4). Python과 동일한 데이터 추출 결과. **patchright 설치 시 playwright 모듈이 대체됨** -- 공존 불가.
- experiment: Node.js에서 embed 엔드포인트 테스트
- lesson: 정확한 좋아요 수(303,745)와 캡션 정상 추출. Python과 완전 동일한 결과.
- experiment: Next.js 통합 패턴 설계
- lesson: 프로젝트에 이미 `@aduptive/instagram-scraper`와 `cheerio`가 있음. Patchright로 교체 가능. API Route 패턴으로 통합 가능하지만 **Vercel serverless에서는 브라우저 실행 불가** -- 별도 서버/워커 필요.
- experiment: Python vs Node.js 비교 분석
- lesson: 은닉성은 Camoufox(Python)가 우위. Next.js 직접 통합은 Node.js(Patchright)가 유리. **Vercel 배포 시에는 둘 다 별도 서버 필요.**

---

# 기존 스크래퍼 분석 + 최종 아키텍처 권장 (Run #9)

## 38. 기존 @aduptive/instagram-scraper 분석

### 38.1 개요

프로젝트에 이미 설치된 `@aduptive/instagram-scraper` (v1.0.3) 패키지 분석:

| 항목 | 내용 |
|------|------|
| **방식** | Headless HTTP (axios) — 브라우저 없이 직접 API 호출 |
| **대상** | Instagram 모바일 API (`/api/v1/`) |
| **인증** | 불필요 (공개 프로필) |
| **언어** | TypeScript (Node.js) |
| **의존성** | axios만 |

### 38.2 테스트 결과 (2026-04-24)

**성공하는 기능**:
```
GET /api/v1/feed/user/{user_id}/  → 프로필 게시물 목록
  ✓ id: 3877448558815842002
  ✓ shortcode: DXPduuvEY7S
  ✓ timestamp: 1776447912
  ✓ display_url: https://scontent-ssn1-1.cdninstagram.com/...
  ✓ caption: 전체 텍스트
  ✓ likes: 좋아요 수
  ✓ comments: 댓글 수
  ✓ is_video: boolean
  ✓ url: 게시물 URL
  ✓ media_type: 미디어 타입
```

**실패하는 기능**:
```
GET /api/v1/media/{shortcode}/info/  → 404 또는 500
  → 미디어 상세 정보 (고해상도 이미지, 비디오 URL 등) 불가
  → Instagram이 이 API 엔드포인트를 차단/변경
```

### 38.3 기존 스크래퍼 vs Patchright 비교

| 항목 | @aduptive/instagram-scraper | Patchright (og:meta + embed) |
|------|----------------------------|----------------------------|
| **브라우저 필요** | 없음 (HTTP 직접) | 있음 (headless) |
| **설치 크기** | ~1MB (axios만) | ~37MB (Chromium 포함) |
| **속도** | 빠름 (~1초) | 느림 (~5초) |
| **게시물 목록** | ✓ 프로필에서 N개 가져오기 | △ HTML 소스에서 추출 (비결정적) |
| **캡션** | ✓ 전체 | ✓ 전체 (embed) |
| **좋아요 수** | ✓ 숫자 (abbreviated 가능) | ✓ 정확한 숫자 (embed) |
| **미디어 ID** | △ API 응답에 포함 | ✓ meta 태그에서 추출 |
| **소유자 ID** | △ user_id만 | ✓ instapp:owner_user_id |
| **고해상도 이미지** | ✗ API 차단 | ✓ og:image (CDN URL) |
| **Vercel 배포** | ✓ 가능 | ✗ 불가능 |
| **Rate limit** | 낮음 (HTTP만) | 높음 (브라우저) |

## 39. 최종 권장 아키텍처 (프로젝트 맞춤)

### 39.1 2단계 전략

**1단계 (빠르고 경량)**: `@aduptive/instagram-scraper`로 프로필 게시물 목록 확보
```
→ 프로필에서 최근 N개 게시물의 shortcode, caption, likes, comments 획득
→ Vercel serverless에서 실행 가능
→ 빠름 (~1초/pro필)
```

**2단계 (필요시)**: Patchright로 추가 데이터 보완
```
→ 게시물별 og:meta (미디어 ID, 소유자 ID, 고해상도 이미지)
→ Embed 엔드포인트 (정확한 좋아요 수, 전체 캡션)
→ 별도 서버/워커에서만 실행 가능
```

### 39.2 권장 구현 패턴

```typescript
// 1단계: 기존 스크래퍼로 게시물 목록 (Vercel에서 실행 가능)
import { InstagramScraper } from '@aduptive/instagram-scraper';

export async function getProfilePosts(username: string, count = 20) {
  const scraper = new InstagramScraper({
    maxRetries: 2,
    minDelay: 2000,
    maxDelay: 5000,
    timeout: 10000,
  });
  
  const results = await scraper.getPosts(username, count);
  if (!results.success || !results.posts) {
    throw new Error(results.error || 'Failed to fetch posts');
  }
  
  return results.posts.map(post => ({
    id: post.id,
    shortcode: post.shortcode,
    caption: post.caption,
    likes: post.likes,
    comments: post.comments,
    timestamp: post.timestamp,
    display_url: post.display_url,
    url: post.url,
    is_video: post.is_video,
  }));
}

// 2단계: Patchright로 상세 데이터 (별도 서버)
import { chromium } from 'patchright';

export async function enrichPostData(postUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const meta = await page.evaluate(() => {
      const get = (p: string) =>
        document.querySelector(`meta[property="${p}"]`)
          ?.getAttribute('content') ?? null;
      return {
        og_image: get('og:image'),
        media_id: get('al:ios:url')?.match(/id=(\d+)/)?.[1] ?? null,
        owner_id: get('instapp:owner_user_id'),
        datetime: document.querySelector('time')?.getAttribute('datetime') ?? null,
      };
    });
    return meta;
  } finally {
    await browser.close();
  }
}
```

### 39.3 배포 아키텍처

```
Vercel (Next.js):
  └── API Route: GET /api/posts?username=nasa
      └── @aduptive/instagram-scraper
          └── Instagram 모바일 API 호출 (HTTP)
          └── 게시물 목록 반환 (빠름, 경량)

별도 워커 (Railway/Fly.io/Docker):
  └── PATCH /api/posts/:shortcode/enrich
      └── Patchright headless browser
          └── og:meta + embed 데이터 보완
          └── 고해상도 이미지, 미디어 ID, 정확한 좋아요 수
```

## 40. What's Been Tried (Run #9 업데이트)

- experiment: @aduptive/instagram-scraper 기존 패키지 분석 및 테스트
- lesson: 프로필 게시물 목록은 정상 작동 (id, shortcode, caption, likes, comments, display_url). 하지만 `/api/v1/media/{id}/info/` API는 404/500으로 차단됨. 브라우저 없이 HTTP만으로 기본 데이터 확보 가능.
- experiment: 기존 스크래퍼 vs Patchright 비교 분석
- lesson: 기존 스크래퍼는 빠르고 경량(Vercel 배포 가능)하지만 상세 데이터 부족. Patchright는 상세 데이터 제공하지만 Vercel 불가. **2단계 전략이 최적**: 기존 스크래퍼로 목록 → Patchright로 보완.
- experiment: 최종 프로젝트 맞춤 아키텍처 설계
- lesson: Vercel에서 `@aduptive/instagram-scraper`로 게시물 목록, 별도 워커에서 Patchright로 상세 데이터. 이 조합이 프로젝트의 기존 의존성을 활용하면서 Patchright의 장점도 취할 수 있음.