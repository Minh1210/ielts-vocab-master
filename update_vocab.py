import os
import sys
import re
import json
import csv
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

APP_DIR = os.path.dirname(os.path.abspath(__file__))
TU_VUNG_DIR = os.path.abspath(os.path.join(APP_DIR, '..', 'từ vựng'))
DATA_FILE = os.path.join(APP_DIR, 'js', 'data', 'ielts_words.js')

def clean_text(s):
    """Remove invisible unicode, soft hyphens, zero-width chars, normalize whitespace."""
    if not s:
        return ''
    s = re.sub(r'[\u00ad\u200b\u200c\u200d\ufeff\xa0]', ' ', str(s))
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def normalize_lemma(word):
    """
    Produce a canonical lemma for duplicate detection.
    - Strips invisible characters
    - Lowercases
    - Strips parentheticals like (VR), (AI), (n), (v), (adj), (sb), (sth)
    - Strips leading particles: 'to ', 'a ', 'an ', 'the '
    - Replaces punctuation with space and normalizes whitespace
    """
    if not word:
        return ''
    w = clean_text(word).lower()
    w = re.sub(r'[\(\[\{].*?[\)\]\}]', '', w)
    w = re.sub(r'^(to\s+|a\s+|an\s+|the\s+)', '', w)
    w = re.sub(r'[^a-z0-9\s]', ' ', w)
    w = re.sub(r'\s+', ' ', w).strip()
    return w

def clean_word_display(word):
    """Clean word for user-facing display: clean trailing parens, strip leading articles, preserve capitalization."""
    w = clean_text(word)
    # Remove trailing abbreviations like (AI), (VR), (n), (v), (adj), (adv)
    w = re.sub(r'\s*\((ai|vr|n|v|adj|adv|phr)\)$', '', w, flags=re.IGNORECASE).strip()
    # Strip leading articles like 'The ', 'A ', 'An ' unless part of an idiom
    m = re.match(r'^(the|a|an)\s+(.*)$', w, flags=re.IGNORECASE)
    if m:
        w = m.group(2).strip()
    if w and w[0].islower():
        w = w[0].upper() + w[1:]
    return w

def detect_band_from_string(text):
    """Detect band score from filename or text, e.g. 'band-5-0' -> '5.0', '7.0' -> '7.0'"""
    m = re.search(r'band[\s\-_]*([4-9])[\.\-_]([05])', text, re.IGNORECASE)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    m2 = re.search(r'\b([4-9]\.[05])\b', text)
    if m2:
        return m2.group(1)
    return None

def clean_topic_name(name):
    """Clean and normalize a topic name into standard IELTS format."""
    name = clean_text(name)
    name = re.sub(r'[\(\[\{].*?[\)\]\}]', '', name)
    name = re.sub(r'^\d+[\.\-\s]+', '', name)
    name = re.sub(r'^(chủ đề|từ vựng ielts|từ vựng|topic)[\s\:\-]+', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\-_\.]+', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name.title() if name else 'General'

def merge_entries(existing, incoming):
    """
    Intelligently merge an incoming duplicate word entry into the existing entry:
    - Retains the cleanest word title
    - Preserves rich definitions & authentic examples over generic placeholders
    - Merges collocations without duplicates
    - Keeps the richer/longer Vietnamese meaning
    - Picks the cleaner IPA transcription
    - Retains the most appropriate band & topic
    """
    merged = dict(existing)
    
    # Clean display words
    clean_ex = clean_word_display(existing.get('word', ''))
    clean_in = clean_word_display(incoming.get('word', ''))
    merged['word'] = clean_ex or clean_in
    
    # Definition
    if not clean_text(merged.get('definition', '')) and clean_text(incoming.get('definition', '')):
        merged['definition'] = clean_text(incoming['definition'])
        
    # Example: prioritize authentic example over generic IELTS placeholder
    ex_is_placeholder = "is common in IELTS" in merged.get('example', '')
    in_is_placeholder = "is common in IELTS" in incoming.get('example', '')
    
    if (ex_is_placeholder and not in_is_placeholder and incoming.get('example')) or not merged.get('example'):
        merged['example'] = clean_text(incoming.get('example', ''))
        merged['exampleVi'] = clean_text(incoming.get('exampleVi', ''))
    elif not ex_is_placeholder and incoming.get('example') and not merged.get('exampleVi') and incoming.get('exampleVi'):
        merged['exampleVi'] = clean_text(incoming['exampleVi'])
        
    # Collocations: combine unique items
    colls = list(merged.get('collocations', []))
    for c in incoming.get('collocations', []):
        c_clean = clean_text(c)
        if c_clean and c_clean not in colls:
            colls.append(c_clean)
    merged['collocations'] = colls
    
    # Meaning: keep the richer/more descriptive Vietnamese translation
    m_ex = clean_text(merged.get('meaning', ''))
    m_in = clean_text(incoming.get('meaning', ''))
    if len(m_in) > len(m_ex) + 4:
        merged['meaning'] = m_in
    else:
        merged['meaning'] = m_ex or m_in
        
    # IPA
    ipa_ex = clean_text(merged.get('ipa', ''))
    ipa_in = clean_text(incoming.get('ipa', ''))
    if (not ipa_ex or '  ' in ipa_ex) and ipa_in:
        merged['ipa'] = ipa_in
    else:
        merged['ipa'] = ipa_ex or ipa_in
        
    # Band: keep max band score
    try:
        b_ex = float(merged.get('band', '6.5'))
        b_in = float(incoming.get('band', '6.5'))
        merged['band'] = f"{max(b_ex, b_in):.1f}"
    except Exception:
        pass
        
    # Clean all string fields
    for k in ['word', 'meaning', 'ipa', 'example', 'exampleVi', 'definition', 'topic', 'type']:
        if k in merged and isinstance(merged[k], str):
            merged[k] = clean_text(merged[k])
            
    return merged

# ----------------- PDF PARSERS -----------------

def parse_band_5_pdf(fpath):
    """Specialized high-precision parser for tu-vung-ielts-band-5-0.pdf"""
    doc = pymupdf.open(fpath)
    words = []
    
    topic_map_by_keyword = [
        (['đồ thị', 'sơ đồ', 'chuyển đổi', 'thay đổi', 'movement'], 'Writing Task 1'),
        (['giống', 'khác', 'compare', 'contrast', 'similarity'], 'Compare & Contrast'),
        (['nguyên nhân', 'kết quả', 'cause', 'effect', 'lead to'], 'Cause & Effect'),
        (['đồng ý', 'không đồng ý', 'agree', 'disagree'], 'Agree & Disagree'),
        (['ưu điểm', 'nhược điểm', 'advantage', 'disadvantage'], 'Writing Task 2'),
        (['education', 'giáo dục', 'học tập', 'school'], 'Education'),
        (['health', 'sức khỏe', 'y tế', 'disease'], 'Health'),
        (['technology', 'công nghệ', 'computer', 'ai'], 'Technology'),
        (['environment', 'môi trường', 'nature', 'pollution'], 'Environment'),
        (['family', 'gia đình', 'household', 'relatives'], 'Family and Relationships'),
        (['work', 'employment', 'việc làm', 'career'], 'Employment')
    ]
    
    current_topic = 'Writing Task 1'
    
    for pno, page in enumerate(doc):
        text = page.get_text('text').lower()
        
        for keywords, topic_name in topic_map_by_keyword:
            if any(kw in text for kw in keywords):
                current_topic = topic_name
                break
                
        tabs = page.find_tables()
        for tab in tabs.tables:
            for row in tab.extract():
                if not row or len(row) < 4: continue
                if len(row) >= 5:
                    w, wtype, ipa, mean, ex = row[0], row[1], row[2], row[3], row[4]
                else:
                    w, ipa, mean, ex = row[0], row[1], row[2], row[3]
                    wtype = 'phrase' if ' ' in str(w) else 'noun'
                    
                w = clean_text(w)
                mean = clean_text(mean)
                if not w or not mean or w.lower() in ['từ vựng', 'word', 'vocabulary']:
                    continue
                if len(w) < 2 or len(mean) < 2:
                    continue
                    
                ipa = clean_text(ipa)
                wtype = clean_text(wtype).lower()
                ex = clean_text(ex)
                
                if 'noun' in wtype: wtype = 'noun'
                elif 'verb' in wtype: wtype = 'verb'
                elif 'adjectiv' in wtype: wtype = 'adjective'
                elif 'adverb' in wtype: wtype = 'adverb'
                elif 'phrase' in wtype: wtype = 'phrase'
                else: wtype = 'noun' if ' ' not in w else 'phrase'
                
                words.append({
                    'word': w,
                    'type': wtype,
                    'ipa': ipa,
                    'meaning': mean,
                    'definition': '',
                    'example': ex,
                    'exampleVi': '',
                    'collocations': [],
                    'topic': current_topic,
                    'band': '5.0'
                })
                
    return words

def parse_zim_7_pdf(fpath):
    """Parse ZIM IELTS 7.0 PDF"""
    doc = pymupdf.open(fpath)
    words = []
    
    for pno in range(len(doc)):
        lines = [clean_text(l) for l in doc[pno].get_text('text').split('\n') if clean_text(l)]
        i = 0
        while i < len(lines):
            line = lines[i]
            if re.match(r'^[A-Za-z\s\-]{3,30}$', line) and i + 1 < len(lines) and lines[i+1].startswith('/'):
                word = line.strip()
                ipa = lines[i+1].strip()
                idx = i + 2
                while idx < len(lines) and '/' not in ipa and '/' in lines[idx]:
                    ipa += ' ' + lines[idx].strip()
                    idx += 1
                
                w_type = 'noun'
                if idx < len(lines) and any(t in lines[idx].lower() for t in ['verb', 'noun', 'adjectiv', 'adverb']):
                    w_type = lines[idx].lower().strip()
                    if 'adjectiv' in w_type: w_type = 'adjective'
                    idx += 1
                    
                meaning_parts = []
                while idx < len(lines) and not re.match(r'^[A-Z][a-z]', lines[idx]) and not lines[idx].startswith('(') and lines[idx] != 'ZIM Academy':
                    meaning_parts.append(lines[idx])
                    idx += 1
                meaning = clean_text(' '.join(meaning_parts))
                
                example_parts = []
                while idx < len(lines) and lines[idx] != 'ZIM Academy' and not (re.match(r'^[A-Za-z\s\-]{3,30}$', lines[idx]) and idx + 1 < len(lines) and lines[idx+1].startswith('/')):
                    example_parts.append(lines[idx])
                    idx += 1
                full_example = clean_text(' '.join(example_parts))
                
                m_ex = re.search(r'^(.*?)\s*\((.*?)\)\s*$', full_example)
                if m_ex:
                    ex_en = m_ex.group(1).strip()
                    ex_vi = m_ex.group(2).strip()
                else:
                    ex_en = full_example
                    ex_vi = ''
                    
                words.append({
                    'word': word,
                    'type': w_type,
                    'ipa': ipa,
                    'meaning': meaning,
                    'definition': '',
                    'example': ex_en,
                    'exampleVi': ex_vi,
                    'collocations': [],
                    'topic': 'ZIM 7.0 Master',
                    'band': '7.0'
                })
                i = idx
            else:
                i += 1
    return words

def parse_33_chu_de_pdf(fpath):
    """Parse Tu-vung-IELTS-33-chu-de.pdf"""
    doc = pymupdf.open(fpath)
    words = []
    current_topic = 'Employment'
    
    topic_base_band = {
        'Daily Routine': '4.0', 'Clothes': '4.0', 'Food': '4.5', 'Appearance': '4.5',
        'Sports': '4.5', 'Weather': '4.5', 'Hobbies': '5.0', 'Family and Relationships': '5.0',
        'Countryside': '5.0', 'Shopping': '5.0', 'Travel': '5.5', 'Accommodation': '5.5',
        'Transportation': '5.5', 'City': '6.0', 'Accident': '6.0', 'Entertainment and media': '6.0',
        'Employment': '6.5', 'Education': '6.5', 'Health': '6.5', 'Culture': '7.0',
        'Technology': '7.0', 'Advertising': '7.0', 'Crime': '7.5', 'Environment': '7.5',
        'Economy': '7.5', 'Science': '8.0', 'Globalization': '8.0'
    }

    for pno, page in enumerate(doc):
        text = page.get_text('text')
        m = re.search(r'(\d+)\.\s+([A-Za-z\s/&]+?)\s*\(([^\)]+)\)', text)
        if m:
            current_topic = clean_text(m.group(2).strip())

        tabs = page.find_tables()
        for tab in tabs.tables:
            for r in tab.extract():
                if not r or len(r) < 3: continue
                w, ipa, mean = r[0], r[1], r[2]
                w = clean_text(w)
                mean = clean_text(mean)
                ipa = clean_text(ipa)
                
                if not w or not mean or w.lower() in ['từ vựng', 'word', 'vocabulary', 'từ vựng ielts']: 
                    continue
                if len(w) < 2 or len(mean) < 2: 
                    continue

                w_lower = w.lower()
                base_b = float(topic_base_band.get(current_topic, '6.0'))
                if len(w_lower) <= 4: base_b -= 0.5
                elif len(w_lower) >= 12 or ' ' in w_lower: base_b += 0.5
                base_b = min(9.0, max(4.0, round(base_b * 2) / 2))
                band_str = f"{base_b:.1f}"

                clean_w = clean_word_display(w)
                words.append({
                    'word': clean_w,
                    'type': 'phrase' if ' ' in clean_w else 'noun',
                    'ipa': ipa,
                    'meaning': mean,
                    'definition': '',
                    'example': f"The concept of '{clean_w}' is common in IELTS {current_topic} discussions.",
                    'exampleVi': f"Khái niệm '{clean_w}' thường gặp trong các chủ đề {current_topic} của IELTS.",
                    'collocations': [],
                    'topic': current_topic,
                    'band': band_str
                })
    return words

def parse_generic_pdf(fpath, topic_name, band_score):
    """Generic table and list parser for arbitrary IELTS PDF files."""
    doc = pymupdf.open(fpath)
    words = []
    for page in doc:
        tabs = page.find_tables()
        for tab in tabs.tables:
            for r in tab.extract():
                if not r or len(r) < 2: continue
                w, mean = clean_text(r[0]), clean_text(r[1])
                ipa = clean_text(r[2]) if len(r) >= 3 else ''
                if not w or not mean or len(w) < 2 or len(mean) < 2: continue
                if w.lower() in ['word', 'từ vựng', 'vocabulary', 'stt', 'no.']: continue
                
                clean_w = clean_word_display(w)
                words.append({
                    'word': clean_w,
                    'type': 'phrase' if ' ' in clean_w else 'noun',
                    'ipa': ipa,
                    'meaning': mean,
                    'definition': '',
                    'example': '',
                    'exampleVi': '',
                    'collocations': [],
                    'topic': topic_name,
                    'band': band_score
                })
    return words

# ----------------- TEXT & CSV PARSERS -----------------

def parse_delimited_file(fpath, topic_name, band_score):
    """Parse CSV, TSV, or TXT word lists."""
    words = []
    delimiter = ',' if fpath.endswith('.csv') else '\t'
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        if lines and lines[0].count('\t') > lines[0].count(','):
            delimiter = '\t'
        elif lines and lines[0].count(';') > lines[0].count(','):
            delimiter = ';'
            
        reader = csv.reader(lines, delimiter=delimiter)
        for row in reader:
            if not row or len(row) < 2: continue
            w = clean_text(row[0])
            m = clean_text(row[1])
            if not w or not m or len(w) < 2 or w.lower() in ['word', 'từ vựng', 'vocabulary']:
                continue
            ipa = clean_text(row[2]) if len(row) > 2 else ''
            ex = clean_text(row[3]) if len(row) > 3 else ''
            b = clean_text(row[4]) if len(row) > 4 and detect_band_from_string(row[4]) else band_score
            t = clean_text(row[5]) if len(row) > 5 else topic_name
            
            clean_w = clean_word_display(w)
            words.append({
                'word': clean_w,
                'type': 'phrase' if ' ' in clean_w else 'noun',
                'ipa': ipa,
                'meaning': m,
                'definition': '',
                'example': ex,
                'exampleVi': '',
                'collocations': [],
                'topic': t,
                'band': b
            })
    except Exception as e:
        print(f"  [!] Lỗi khi đọc file bảng {fpath}: {e}")
    return words

# ----------------- MAIN PIPELINE -----------------

def run_full_update():
    print("=" * 70)
    print("  🚀 CÔNG CỤ TỰ ĐỘNG CẬP NHẬT, PHÂN LOẠI & LỌC TRÙNG TỪ VỰNG IELTS")
    print(f"  Thư mục tài liệu: {TU_VUNG_DIR}")
    print("=" * 70)

    if not os.path.exists(TU_VUNG_DIR):
        os.makedirs(TU_VUNG_DIR, exist_ok=True)
        print("[!] Đã tạo thư mục 'từ vựng'.")
        return

    # 1. Load existing curated words or current database
    curated_map = {} # lemma -> word
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            t = f.read()
        m = re.search(r'const DEFAULT_IELTS_WORDS = (\[.*?\]);', t, re.DOTALL)
        if m:
            try:
                raw_items = json.loads(m.group(1))
                for item in raw_items:
                    item['word'] = clean_word_display(item['word'])
                    lemma = normalize_lemma(item['word'])
                    if not lemma:
                        continue
                    if lemma in curated_map:
                        curated_map[lemma] = merge_entries(curated_map[lemma], item)
                    else:
                        curated_map[lemma] = item
            except Exception as e:
                print(f"[!] Warning reading existing database: {e}")

    print(f"[*] Cơ sở từ vựng hiện có: {len(curated_map)} từ duy nhất")

    # 2. Scan and parse all documents in 'từ vựng'
    files = [f for f in os.listdir(TU_VUNG_DIR) if not f.startswith('~') and not f.startswith('.')]
    print(f"[*] Đang quét {len(files)} tệp trong thư mục 'từ vựng'...")

    duplicate_merged_count = 0
    new_words_count = 0

    for fname in sorted(files):
        fpath = os.path.join(TU_VUNG_DIR, fname)
        fname_lower = fname.lower()
        extracted = []

        if 'band-5-0' in fname_lower or '5.0' in fname_lower:
            print(f"  --> Phát hiện tài liệu Band 5.0: {fname}")
            extracted = parse_band_5_pdf(fpath)
        elif '7.0' in fname_lower:
            print(f"  --> Phát hiện tài liệu Band 7.0: {fname}")
            extracted = parse_zim_7_pdf(fpath)
        elif '33' in fname_lower:
            print(f"  --> Phát hiện tài liệu 33 Chủ đề: {fname}")
            extracted = parse_33_chu_de_pdf(fpath)
        elif fname_lower.endswith('.pdf'):
            detected_b = detect_band_from_string(fname) or '6.5'
            topic = clean_topic_name(os.path.splitext(fname)[0])
            print(f"  --> Quét PDF '{fname}' (Gán Band: {detected_b}, Chủ đề: {topic})")
            extracted = parse_generic_pdf(fpath, topic, detected_b)
        elif fname_lower.endswith(('.csv', '.tsv', '.txt')):
            detected_b = detect_band_from_string(fname) or '6.5'
            topic = clean_topic_name(os.path.splitext(fname)[0])
            print(f"  --> Quét danh sách '{fname}' (Gán Band: {detected_b}, Chủ đề: {topic})")
            extracted = parse_delimited_file(fpath, topic, detected_b)
        elif fname_lower.endswith('.json'):
            try:
                with open(fpath, 'r', encoding='utf-8') as jf:
                    extracted = json.load(jf)
                print(f"  --> Quét JSON '{fname}' ({len(extracted)} từ)")
            except Exception as e:
                print(f"  [!] Lỗi đọc JSON {fname}: {e}")

        # 3. Deduplication & Smart Merge
        for item in extracted:
            item['word'] = clean_word_display(item['word'])
            lemma = normalize_lemma(item['word'])
            if not lemma or len(item.get('meaning', '')) < 2:
                continue

            if lemma in curated_map:
                curated_map[lemma] = merge_entries(curated_map[lemma], item)
                duplicate_merged_count += 1
            else:
                for k in ['word', 'meaning', 'ipa', 'example', 'exampleVi', 'definition', 'topic', 'type']:
                    if k in item and isinstance(item[k], str):
                        item[k] = clean_text(item[k])
                curated_map[lemma] = item
                new_words_count += 1

    # 4. Finalize IDs and sort words
    final_words = list(curated_map.values())
    
    # Assign stable IDs: keep curated ids, assign sequential w_XXXX for others
    existing_ids = set()
    for w in final_words:
        wid = w.get('id', '')
        if wid and not wid.startswith('w_'):
            existing_ids.add(wid)
            
    seq = 1
    for w in final_words:
        wid = w.get('id', '')
        if not wid or wid.startswith('w_'):
            new_id = f"w_{seq:04d}"
            while new_id in existing_ids:
                seq += 1
                new_id = f"w_{seq:04d}"
            w['id'] = new_id
            existing_ids.add(new_id)
            seq += 1

    # Statistics by Band & Topic
    band_stats = {}
    topic_stats = {}
    for w in final_words:
        b = w.get('band', '7.0')
        t = w.get('topic', 'General')
        band_stats[b] = band_stats.get(b, 0) + 1
        topic_stats[t] = topic_stats.get(t, 0) + 1

    print("\n" + "=" * 70)
    print("  ✅ BÁO CÁO CẬP NHẬT & LỌC TRÙNG TỪ VỰNG:")
    print(f"  • Số từ trùng lặp đã phát hiện và gộp tối ưu: {duplicate_merged_count} trường hợp")
    print(f"  • TỔNG SỐ TỪ VỰNG DUY NHẤT (100% KHÔNG TRÙNG LẶP): {len(final_words)} từ")
    print("=" * 70)

    print("\n📊 Phân bổ theo Band điểm IELTS (Từ 4.0 đến 9.0):")
    for b in sorted(band_stats.keys(), key=lambda x: float(x)):
        bar = "█" * min(40, max(1, band_stats[b] // 20))
        print(f"  • Band {b}: {band_stats[b]:>4} từ  {bar}")

    print(f"\n📚 Phân bổ theo {len(topic_stats)} chủ đề IELTS rõ ràng:")
    for t in sorted(topic_stats.keys()):
        print(f"  • {t:<30}: {topic_stats[t]:>4} từ")

    # 5. Write to js/data/ielts_words.js
    js_content = f"// Comprehensive IELTS Vocabulary Database - {len(final_words)} unique words across All Bands & Topics\n"
    js_content += f"const DEFAULT_IELTS_WORDS = {json.dumps(final_words, ensure_ascii=False, indent=2)};\n\n"
    js_content += """
function getAllTopics() {
  const topics = new Set(DEFAULT_IELTS_WORDS.map(w => w.topic));
  return Array.from(topics).filter(Boolean).sort();
}

function getAllBands() {
  return ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_IELTS_WORDS, getAllTopics, getAllBands };
}
"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"\n[✓] Đã xuất bản thành công vào: {DATA_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    run_full_update()
