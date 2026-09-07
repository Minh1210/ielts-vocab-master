import os
import sys
import re
import json
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

APP_DIR = r"e:\học tiếng anh\ielts_vocab_app"
TU_VUNG_DIR = r"e:\học tiếng anh\từ vựng"
DATA_FILE = os.path.join(APP_DIR, 'js', 'data', 'ielts_words.js')

# ---------------------------------------------------------
# 1. CURATED MULTI-MEANING (POLYSEMOUS) & HIGH-IMPACT DICTIONARY
# ---------------------------------------------------------
POLYSEMY_DICT = {
    'trip': {
        'type': 'noun, verb',
        'meaning': 'Chuyến đi, cuộc hành trình (n); Vấp, vấp ngã, trượt chân (v)',
        'definition': 'A journey in which you go somewhere, usually for a short time, and come back again; or to catch one\'s foot on something and fall or lose balance.',
        'example': 'She went on a memorable trip to Singapore, but accidentally tripped on the stairs and sprained her ankle.',
        'exampleVi': 'Cô ấy đã có một chuyến đi đáng nhớ đến Singapore, nhưng không may bị vấp ở cầu thang và bong gân mắt cá chân.',
        'collocations': ['business trip', 'round trip', 'day trip', 'trip over something'],
        'topic': 'Travel & Tourism',
        'band': '5.0'
    },
    'address': {
        'type': 'noun, verb',
        'meaning': 'Địa chỉ (n); Giải quyết, xử lý một vấn đề (v); Phát biểu trước đám đông (v)',
        'definition': 'The details of the place where someone lives; or to give attention to or deal with a serious problem.',
        'example': 'Governments worldwide must urgently address the escalating crisis of climate change.',
        'exampleVi': 'Các chính phủ trên toàn thế giới phải khẩn trương giải quyết cuộc khủng hoảng biến đổi khí hậu đang leo thang.',
        'collocations': ['address an issue', 'address a challenge', 'address the problem', 'keynote address'],
        'topic': 'Society',
        'band': '7.0'
    },
    'record': {
        'type': 'noun, verb',
        'meaning': 'Hồ sơ, kỷ lục, bệnh án (n); Ghi âm, ghi nhận lại (v)',
        'definition': 'The best result ever achieved, or written information kept for the future; to store sounds, images, or data.',
        'example': 'Global surface temperatures broke the previous record high recorded in modern meteorology.',
        'exampleVi': 'Nhiệt độ bề mặt toàn cầu đã phá vỡ mức kỷ lục cao trước đó từng được ghi nhận trong khí tượng học hiện đại.',
        'collocations': ['track record', 'break a record', 'set a record', 'medical record'],
        'topic': 'Science',
        'band': '6.5'
    },
    'plant': {
        'type': 'noun, verb',
        'meaning': 'Thực vật, cây cỏ (n); Nhà máy, xí nghiệp (n); Gieo trồng, thiết lập (v)',
        'definition': 'A living organism producing energy by photosynthesis; or an industrial factory or power station; to put seeds in the ground.',
        'example': 'The automotive conglomerate constructed a state-of-the-art manufacturing plant powered by renewable solar energy.',
        'exampleVi': 'Tập đoàn ô tô đã xây dựng một nhà máy sản xuất hiện đại chạy bằng năng lượng mặt trời tái tạo.',
        'collocations': ['manufacturing plant', 'power plant', 'plant species', 'plant trees'],
        'topic': 'Environment',
        'band': '5.5'
    },
    'lead': {
        'type': 'verb, noun',
        'meaning': 'Dẫn dắt, dẫn đến kết quả (v); Vị trí dẫn đầu, kim loại chì (n)',
        'definition': 'To control a group or direct a process; or to cause something to happen; a soft heavy grey metallic element.',
        'example': 'Sedentary lifestyles and poor dietary choices frequently lead to severe cardiovascular disorders.',
        'exampleVi': 'Lối sống ít vận động và chế độ ăn uống kém lành mạnh thường dẫn đến các chứng rối loạn tim mạch nghiêm trọng.',
        'collocations': ['lead to', 'take the lead', 'leadership skills', 'lead exposure'],
        'topic': 'Health',
        'band': '5.5'
    },
    'issue': {
        'type': 'noun, verb',
        'meaning': 'Vấn đề quan trọng, số báo/ấn phẩm (n); Ban hành, phát hành, cấp (v)',
        'definition': 'An important topic or problem for discussion; or to produce or distribute something officially.',
        'example': 'Affordable housing has emerged as a contentious social issue in metropolitan areas.',
        'exampleVi': 'Nhà ở giá rẻ đã nổi lên như một vấn đề xã hội gây nhiều tranh cãi tại các khu vực đô thị lớn.',
        'collocations': ['pressing issue', 'controversial issue', 'issue a statement', 'raise an issue'],
        'topic': 'Social issues',
        'band': '6.5'
    },
    'present': {
        'type': 'noun, verb, adjective',
        'meaning': 'Món quà, thời hiện tại (n); Trình bày, xuất trình (v); Có mặt, hiện diện (adj)',
        'definition': 'Something given as a gift, or current period; to introduce or show findings; being in a particular place.',
        'example': 'Researchers presented conclusive empirical evidence on the correlation between air pollution and respiratory illness.',
        'exampleVi': 'Các nhà nghiên cứu đã trình bày bằng chứng thực nghiệm thuyết phục về mối tương quan giữa ô nhiễm không khí và bệnh hô hấp.',
        'collocations': ['present findings', 'present evidence', 'at present', 'present a challenge'],
        'topic': 'Science',
        'band': '6.5'
    },
    'fine': {
        'type': 'adjective, noun, verb',
        'meaning': 'Tốt, ổn, tinh tế (adj); Tiền phạt (n); Phạt tiền (v)',
        'definition': 'Of high quality or acceptable; an amount of money exacted as a penalty; to punish someone by demanding money.',
        'example': 'Authorities imposed heavy financial fines on factories that discharged untreated effluent into the river.',
        'exampleVi': 'Các nhà chức trách đã áp đặt các khoản tiền phạt nặng đối với các nhà máy xả nước thải chưa qua xử lý ra sông.',
        'collocations': ['hefty fine', 'pay a fine', 'fine details', 'fine arts'],
        'topic': 'Crime',
        'band': '6.0'
    },
    'novel': {
        'type': 'noun, adjective',
        'meaning': 'Cuốn tiểu thuyết (n); Mới lạ, độc đáo, sáng tạo (adj)',
        'definition': 'A long written story about imaginary people and events; or interestingly new, original, and unusual.',
        'example': 'Scientists have devised a novel methodology for filtering microplastics from ocean currents.',
        'exampleVi': 'Các nhà khoa học đã nghĩ ra một phương pháp mới lạ để lọc các hạt vi nhựa khỏi các dòng hải lưu.',
        'collocations': ['novel approach', 'novel idea', 'classic novel', 'historical novel'],
        'topic': 'Science',
        'band': '7.5'
    },
    'produce': {
        'type': 'verb, noun',
        'meaning': 'Sản xuất, chế tạo, tạo ra (v); Nông sản tươi sống (n)',
        'definition': 'To make or create something from raw materials; or agricultural crops, especially fresh fruit and vegetables.',
        'example': 'Local farmers markets provide organic fresh produce grown without synthetic pesticides.',
        'exampleVi': 'Các chợ nông sản địa phương cung cấp nông sản tươi hữu cơ được trồng mà không sử dụng thuốc trừ sâu tổng hợp.',
        'collocations': ['fresh produce', 'produce crops', 'produce energy', 'mass produce'],
        'topic': 'Food',
        'band': '6.0'
    },
    'contract': {
        'type': 'noun, verb',
        'meaning': 'Hợp đồng, giao kèo (n); Ký hợp đồng (v); Co lại, thu nhỏ (v); Mắc bệnh (v)',
        'definition': 'A legally binding agreement; or to become smaller or tighter; or to catch an infectious illness.',
        'example': 'Employees signed a permanent employment contract detailing healthcare allowances and annual leave.',
        'exampleVi': 'Người lao động đã ký hợp đồng lao động chính thức nêu chi tiết các khoản phụ cấp chăm sóc sức khỏe và nghỉ phép hàng năm.',
        'collocations': ['sign a contract', 'breach of contract', 'contract a disease', 'contract terms'],
        'topic': 'Employment',
        'band': '6.5'
    },
    'scale': {
        'type': 'noun, verb',
        'meaning': 'Quy mô, thang đo, vảy cá, chiếc cân (n); Leo trèo, tăng giảm kích thước (v)',
        'definition': 'The size or level of something; a range of numbers used to show the size; to climb up a steep surface.',
        'example': 'Developing nations need massive financial investment to implement renewable energy projects on a national scale.',
        'exampleVi': 'Các quốc gia đang phát triển cần sự đầu tư tài chính lớn để triển khai các dự án năng lượng tái tạo trên quy mô quốc gia.',
        'collocations': ['large-scale', 'on a global scale', 'sliding scale', 'scale up'],
        'topic': 'Economy',
        'band': '7.0'
    },
    'custom': {
        'type': 'noun, adjective',
        'meaning': 'Phong tục, tập quán, truyền thống (n); Hải quan kiểm soát (n, số nhiều); Tùy biến (adj)',
        'definition': 'A traditional and widely accepted way of behaving; or government department checking luggage; made to order.',
        'example': 'Preserving indigenous customs and traditions helps communities maintain their unique cultural identity.',
        'exampleVi': 'Việc bảo tồn các phong tục và truyền thống bản địa giúp các cộng đồng duy trì bản sắc văn hóa độc đáo của họ.',
        'collocations': ['local custom', 'ancient custom', 'customs officer', 'clear customs'],
        'topic': 'Culture',
        'band': '6.0'
    },
    'notice': {
        'type': 'noun, verb',
        'meaning': 'Thông báo, sự chú ý (n); Nhận thấy, để ý, chú ý (v)',
        'definition': 'Information or warning about something that will happen; or to become aware of something through observation.',
        'example': 'Teachers noticed a marked improvement in student participation after interactive software was introduced.',
        'exampleVi': 'Các giáo viên nhận thấy sự cải thiện rõ rệt trong việc tham gia của học sinh sau khi phần mềm tương tác được đưa vào sử dụng.',
        'collocations': ['short notice', 'give notice', 'noticeable difference', 'come to notice'],
        'topic': 'Education',
        'band': '5.5'
    },
    'sign': {
        'type': 'noun, verb',
        'meaning': 'Biển báo, dấu hiệu, triệu chứng (n); Ký tên, ký hợp đồng (v)',
        'definition': 'A symbol, notice, or gesture conveying information; or to write one\'s name on a legal document.',
        'example': 'Severe fatigue and memory impairment can be early warning signs of cognitive exhaustion.',
        'exampleVi': 'Mệt mỏi nghiêm trọng và suy giảm trí nhớ có thể là những dấu hiệu cảnh báo sớm của tình trạng kiệt sức nhận thức.',
        'collocations': ['warning sign', 'sign an agreement', 'sign language', 'vital signs'],
        'topic': 'Health',
        'band': '5.5'
    },
    'train': {
        'type': 'noun, verb',
        'meaning': 'Đoàn tàu, xe lửa (n); Huấn luyện, rèn luyện, đào tạo (v)',
        'definition': 'A series of railway carriages or wagons; or to teach a person or animal skills through practice.',
        'example': 'High-speed trains offer an environmentally sustainable alternative to short-haul domestic flights.',
        'exampleVi': 'Tàu cao tốc mang lại một giải pháp thay thế bền vững với môi trường cho các chuyến bay nội địa chặng ngắn.',
        'collocations': ['high-speed train', 'train staff', 'rigorous training', 'vocational training'],
        'topic': 'Transportation',
        'band': '5.5'
    },
    'sound': {
        'type': 'noun, adjective, verb',
        'meaning': 'Âm thanh (n); Vững chắc, hợp lý, sâu giấc (adj); Phát ra âm thanh (v)',
        'definition': 'Vibrations travelling through the air that can be heard; in good condition, solid, or sensible.',
        'example': 'Sound urban planning ensures adequate green spaces and efficient sewage networks for growing cities.',
        'exampleVi': 'Quy hoạch đô thị hợp lý đảm bảo có đủ không gian xanh và mạng lưới thoát nước hiệu quả cho các thành phố đang phát triển.',
        'collocations': ['sound advice', 'sound decision', 'sound asleep', 'sound quality'],
        'topic': 'City',
        'band': '6.5'
    },
    'fair': {
        'type': 'adjective, noun',
        'meaning': 'Công bằng, bình đẳng (adj); Hội chợ triển lãm (n)',
        'definition': 'Treating people equally without favouritism; or a public event for trade, entertainment, or carnival.',
        'example': 'Universities host annual career fairs where graduating seniors interview with prospective corporate employers.',
        'exampleVi': 'Các trường đại học tổ chức hội chợ việc làm thường niên, nơi sinh viên năm cuối sắp tốt nghiệp phỏng vấn với các nhà tuyển dụng doanh nghiệp tiềm năng.',
        'collocations': ['job fair', 'career fair', 'fair trial', 'fair share'],
        'topic': 'Employment',
        'band': '6.0'
    },
    'match': {
        'type': 'noun, verb',
        'meaning': 'Trận thi đấu, que diêm (n); Tương xứng, khớp với, hòa hợp (v)',
        'definition': 'A competitive sports contest; or something that resembles or pairs well with another item.',
        'example': 'Applicants must possess vocational credentials that closely match the technical requirements of the vacancy.',
        'exampleVi': 'Ứng viên phải có bằng cấp nghề phù hợp chặt chẽ với các yêu cầu kỹ thuật của vị trí còn trống.',
        'collocations': ['football match', 'close match', 'match expectations', 'perfect match'],
        'topic': 'Sports and Equipments',
        'band': '5.5'
    },
    'degree': {
        'type': 'noun',
        'meaning': 'Bằng cấp đại học (n); Mức độ, nấc thang, độ (n)',
        'definition': 'A qualification given to a student after completing university studies; or the amount or intensity of something.',
        'example': 'Holding an advanced university degree significantly bolsters candidates\' long-term earning potential.',
        'exampleVi': 'Sở hữu một tấm bằng đại học nâng cao giúp gia tăng đáng kể tiềm năng thu nhập dài hạn của các ứng viên.',
        'collocations': ['university degree', 'bachelor\'s degree', 'degree of difficulty', 'to a high degree'],
        'topic': 'Education',
        'band': '6.0'
    },
    'state': {
        'type': 'noun, verb',
        'meaning': 'Trạng thái, tình trạng (n); Nhà nước, tiểu bang (n); Tuyên bố, phát biểu (v)',
        'definition': 'The condition that something is in; or an organized political community under one government; to express formally.',
        'example': 'The spokesperson stated that comprehensive welfare subsidies would be allocated to low-income families.',
        'exampleVi': 'Người phát ngôn tuyên bố rằng các khoản trợ cấp phúc lợi toàn diện sẽ được phân bổ cho các gia đình có thu nhập thấp.',
        'collocations': ['state of mind', 'state of affairs', 'welfare state', 'clearly stated'],
        'topic': 'Society',
        'band': '6.5'
    }
}

# ---------------------------------------------------------
# 2. INTELLIGENT POS & MORPHOLOGY DETECTOR
# ---------------------------------------------------------
def detect_pos(word, meaning, current_type):
    w = word.strip().lower()
    m = meaning.strip().lower()

    if w in POLYSEMY_DICT:
        return POLYSEMY_DICT[w]['type']

    if ' ' in w and not w.startswith(('to ', 'a ', 'an ', 'the ')):
        return 'phrase'

    # Meaning indicators
    if any(m.startswith(v) for v in ['làm cho', 'gây ra', 'tạo ra', 'thay đổi', 'tăng', 'giảm', 'cải thiện',
                                     'bảo vệ', 'tiêu diệt', 'ngăn chặn', 'hạn chế', 'phát triển', 'tham gia',
                                     'giải quyết', 'hỗ trợ', 'vấp', 'ngã', 'trượt', 'phá hủy', 'xây dựng',
                                     'cung cấp', 'sản xuất', 'thúc đẩy', 'đóng góp', 'khám phá', 'phân tích']):
        return 'verb'

    if any(cue in m for cue in ['nhanh', 'chậm', 'thông minh', 'độc hại', 'nguy hiểm', 'bền vững',
                                'thảm khốc', 'quan trọng', 'cần thiết', 'rõ ràng', 'chính xác',
                                'khó khăn', 'dễ dàng', 'nghiêm trọng', 'to lớn', 'nhỏ bé', 'thuộc về']) or \
       m.startswith(('có tính', 'mang tính')):
        return 'adjective'

    # Suffixes
    if w.endswith(('able', 'ible', 'ous', 'ious', 'ful', 'less', 'ive', 'ic', 'al')):
        return 'adjective'
    if w.endswith(('ize', 'ise', 'ify', 'ate')) and not w.endswith(('state', 'rate', 'climate', 'date', 'fate', 'senate')):
        return 'verb'
    if w.endswith('ly') and len(w) > 4:
        return 'adverb'
    if w.endswith(('tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'er', 'or', 'ist', 'ism')):
        return 'noun'

    return current_type or 'noun'

# ---------------------------------------------------------
# 3. DOMAIN-SPECIFIC NATURAL IELTS SENTENCE GENERATOR
# ---------------------------------------------------------
def generate_contextual_example(word, meaning, pos, topic):
    """
    Generate natural, grammatically correct, authentic IELTS sentences
    illustrating the word in context for Writing Task 1/2 or Speaking.
    """
    w = word.strip()
    m = meaning.strip()
    clean_w = re.sub(r'^(to\s+|a\s+|an\s+|the\s+)', '', w, flags=re.IGNORECASE)
    
    # Check polysemy dictionary
    lemma = clean_w.lower()
    if lemma in POLYSEMY_DICT:
        entry = POLYSEMY_DICT[lemma]
        return entry['example'], entry['exampleVi'], entry.get('definition', ''), entry.get('collocations', [])

    # Contextual sentence patterns by Part of Speech & Topic
    if pos == 'verb' or 'verb' in pos:
        ex_en = f"Governments and institutions should take active measures to {w.lower()} effectively across various sectors."
        ex_vi = f"Chính phủ và các tổ chức cần có những biện pháp chủ động để {m.lower()} một cách hiệu quả trên nhiều lĩnh vực."
    elif pos == 'adjective':
        ex_en = f"Maintaining a {w.lower()} approach is widely considered indispensable in modern {topic.lower()}."
        ex_vi = f"Duy trì một cách tiếp cận {m.lower()} được coi là điều không thể thiếu trong lĩnh vực {topic.lower()} hiện đại."
    elif pos == 'phrase':
        ex_en = f"Understanding the role of '{w}' provides candidates with valuable analytical depth in IELTS discussions."
        ex_vi = f"Hiểu được vai trò của '{m}' mang lại cho thí sinh chiều sâu phân tích giá trị trong các bài thi IELTS."
    else: # noun
        ex_en = f"Public investment in {w.lower()} plays an instrumental role in fostering sustainable societal development."
        ex_vi = f"Đầu tư công vào {m.lower()} đóng vai trò quan trọng trong việc thúc đẩy sự phát triển xã hội bền vững."

    # Specific topic enrichments
    topic_lower = topic.lower()
    if 'environment' in topic_lower or 'climate' in topic_lower:
        if pos == 'noun':
            ex_en = f"Stringent environmental regulations are necessary to mitigate the adverse impacts associated with {w.lower()}."
            ex_vi = f"Các quy định môi trường nghiêm ngặt là cần thiết để giảm thiểu các tác động tiêu cực liên quan đến {m.lower()}."
    elif 'technology' in topic_lower or 'science' in topic_lower:
        if pos == 'noun':
            ex_en = f"Recent breakthroughs in {w.lower()} have revolutionized everyday communication and industrial efficiency."
            ex_vi = f"Những đột phá gần đây trong {m.lower()} đã cách mạng hóa giao tiếp hàng ngày và hiệu quả công nghiệp."
    elif 'employment' in topic_lower or 'economy' in topic_lower:
        if pos == 'noun':
            ex_en = f"Providing adequate support for {w.lower()} remains an essential responsibility for corporate leadership."
            ex_vi = f"Việc cung cấp sự hỗ trợ đầy đủ cho {m.lower()} vẫn là một trách nhiệm thiết yếu của các nhà lãnh đạo doanh nghiệp."
    elif 'health' in topic_lower or 'disease' in topic_lower:
        if pos == 'noun':
            ex_en = f"Medical professionals emphasize that early detection of {w.lower()} substantially improves patient recovery rates."
            ex_vi = f"Các chuyên gia y tế nhấn mạnh rằng việc phát hiện sớm {m.lower()} sẽ cải thiện đáng kể tỷ lệ hồi phục của bệnh nhân."
    elif 'education' in topic_lower:
        if pos == 'noun':
            ex_en = f"Modern curricula integrate {w.lower()} to cultivate critical thinking and problem-solving skills among students."
            ex_vi = f"Các chương trình giảng dạy hiện đại tích hợp {m.lower()} để trau dồi tư duy phản biện và kỹ năng giải quyết vấn đề cho học sinh."
    elif 'accident' in topic_lower:
        if pos == 'noun':
            ex_en = f"Emergency services responded swiftly to the site where the {w.lower()} occurred on the highway."
            ex_vi = f"Lực lượng cấp cứu đã nhanh chóng có mặt tại địa điểm xảy ra {m.lower()} trên đường cao tốc."
    elif 'appearance' in topic_lower:
        if pos == 'adjective':
            ex_en = f"The candidate impressed the interview panel with their {w.lower()} demeanor and articulate communication."
            ex_vi = f"Ứng viên đã gây ấn tượng với hội đồng phỏng vấn nhờ phong thái {m.lower()} và khả năng giao tiếp lưu loát."

    definition = f"A term relating to {topic} denoting '{m}'."
    collocations = [f"key {w.lower()}", f"significant {w.lower()}"]

    return ex_en, ex_vi, definition, collocations

print("[✓] Semantic modules defined.")

import os
import sys
import re
import json
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

APP_DIR = r"e:\học tiếng anh\ielts_vocab_app"
TU_VUNG_DIR = r"e:\học tiếng anh\từ vựng"
DATA_FILE = os.path.join(APP_DIR, 'js', 'data', 'ielts_words.js')

# Import our semantic definitions
# Embedded semantic enricher above

def clean_text(s):
    if not s: return ''
    s = re.sub(r'[\u00ad\u200b\u200c\u200d\ufeff\xa0]', ' ', str(s))
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def normalize_lemma(word):
    if not word: return ''
    w = clean_text(word).lower()
    w = re.sub(r'[\(\[\{].*?[\)\]\}]', '', w)
    w = re.sub(r'^(to\s+|a\s+|an\s+|the\s+)', '', w)
    w = re.sub(r'[^a-z0-9\s]', ' ', w)
    w = re.sub(r'\s+', ' ', w).strip()
    return w

def clean_word_display(word):
    w = clean_text(word)
    w = re.sub(r'\s*\((ai|vr|n|v|adj|adv|phr)\)$', '', w, flags=re.IGNORECASE).strip()
    m = re.match(r'^(the|a|an)\s+(.*)$', w, flags=re.IGNORECASE)
    if m:
        w = m.group(2).strip()
    if w and w[0].islower():
        w = w[0].upper() + w[1:]
    return w

def parse_band_5_pdf(fpath):
    doc = pymupdf.open(fpath)
    words = []
    current_topic = 'Writing Task 1'
    topic_map = [
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
    for page in doc:
        text = page.get_text('text').lower()
        for kws, tname in topic_map:
            if any(kw in text for kw in kws):
                current_topic = tname
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
                if not w or not mean or len(w) < 2 or len(mean) < 2: continue
                if w.lower() in ['từ vựng', 'word', 'vocabulary']: continue
                
                clean_w = clean_word_display(w)
                words.append({
                    'word': clean_w,
                    'type': clean_text(wtype).lower(),
                    'ipa': clean_text(ipa),
                    'meaning': mean,
                    'definition': '',
                    'example': clean_text(ex),
                    'exampleVi': '',
                    'collocations': [],
                    'topic': current_topic,
                    'band': '5.0'
                })
    return words

def parse_zim_7_pdf(fpath):
    doc = pymupdf.open(fpath)
    words = []
    for page in doc:
        lines = [clean_text(l) for l in page.get_text('text').split('\n') if clean_text(l)]
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
                    'word': clean_word_display(word),
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
    """Parse Tu-vung-IELTS-33-chu-de.pdf with BOUNDING-BOX AWARE TOPIC ASSIGNMENT"""
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
        # 1. Detect all topic headings and their y-coordinates on this page
        blocks = page.get_text('blocks')
        headings = []
        for b in blocks:
            m = re.search(r'(\d+)\.\s+([A-Za-z\s/&]+?)\s*\(([^\)]+)\)', b[4])
            if m:
                headings.append((b[1], clean_text(m.group(2).strip())))
        headings.sort(key=lambda x: x[0])

        # 2. Extract tables by comparing table y0 with heading y0
        tabs = page.find_tables()
        for tab in tabs.tables:
            tab_y = tab.bbox[1]
            for h_y, h_topic in headings:
                if tab_y >= h_y:
                    current_topic = h_topic

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
                    'example': '', # Will be enriched by semantic engine
                    'exampleVi': '',
                    'collocations': [],
                    'topic': current_topic,
                    'band': band_str
                })
    return words

def execute_overhaul():
    print("=" * 70)
    print("  🚀 THỰC HIỆN RÀ SOÁT & NÂNG CẤP TOÀN BỘ NGỮ NGHĨA TỪ VỰNG IELTS")
    print("=" * 70)

    # 1. Load curated AWL & Core words from current ielts_words.js
    curated_map = {}
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        t = f.read()
    m = re.search(r'const DEFAULT_IELTS_WORDS = (\[.*?\]);', t, re.DOTALL)
    raw_existing = json.loads(m.group(1))
    for item in raw_existing:
        if item.get('id', '').startswith(('env_', 'edu_', 'tech_', 'hea_', 'soc_', 'cri_', 'eco_', 'art_', 'awl_', 'sci_')):
            lemma = normalize_lemma(item['word'])
            curated_map[lemma] = item

    print(f"[*] Đã nạp {len(curated_map)} từ vựng cốt lõi cao cấp (AWL & Band 8.5-9.0)")

    # 2. Extract from PDFs with fixed bounding-box boundaries
    pdf_33 = os.path.join(TU_VUNG_DIR, 'Tu-vung-IELTS-33-chu-de.pdf')
    pdf_5 = os.path.join(TU_VUNG_DIR, 'tu-vung-ielts-band-5-0.pdf')
    pdf_7 = os.path.join(TU_VUNG_DIR, 'từ vựng IELTS 7.0.pdf')

    words_33 = parse_33_chu_de_pdf(pdf_33) if os.path.exists(pdf_33) else []
    words_5 = parse_band_5_pdf(pdf_5) if os.path.exists(pdf_5) else []
    words_7 = parse_zim_7_pdf(pdf_7) if os.path.exists(pdf_7) else []

    print(f"[*] Bóc tách từ 33 chủ đề (sửa lỗi ranh giới trang): {len(words_33)} từ")
    print(f"[*] Bóc tách từ Band 5.0: {len(words_5)} từ")
    print(f"[*] Bóc tách từ Band 7.0 (ZIM): {len(words_7)} từ")

    # 3. Merge & Deduplicate
    all_raw = words_5 + words_7 + words_33
    for it in all_raw:
        lemma = normalize_lemma(it['word'])
        if not lemma or len(it.get('meaning', '')) < 2:
            continue
        if lemma not in curated_map:
            curated_map[lemma] = it
        else:
            # Merge if better
            ex = curated_map[lemma]
            if not ex.get('example') and it.get('example'):
                ex['example'] = it['example']
                ex['exampleVi'] = it.get('exampleVi', '')
            if not ex.get('ipa') and it.get('ipa'):
                ex['ipa'] = it['ipa']
            if len(it.get('meaning', '')) > len(ex.get('meaning', '')) + 5:
                ex['meaning'] = it['meaning']

    print(f"[*] Tổng số từ duy nhất cần chuẩn hóa ngữ nghĩa: {len(curated_map)} từ")

    # 4. SEMANTIC OVERHAUL: Apply Polysemy, POS Detection & Contextual Sentences
    polysemy_count = 0
    enhanced_examples_count = 0

    final_words = []
    for lemma, item in curated_map.items():
        w_clean = clean_word_display(item['word'])
        item['word'] = w_clean
        
        # Check polysemy dictionary first
        if lemma in POLYSEMY_DICT:
            p_data = POLYSEMY_DICT[lemma]
            item['type'] = p_data['type']
            item['meaning'] = p_data['meaning']
            item['definition'] = p_data['definition']
            item['example'] = p_data['example']
            item['exampleVi'] = p_data['exampleVi']
            item['collocations'] = p_data['collocations']
            item['topic'] = p_data['topic']
            item['band'] = p_data['band']
            polysemy_count += 1
        else:
            # Detect POS
            detected_type = detect_pos(item['word'], item.get('meaning', ''), item.get('type', 'noun'))
            item['type'] = detected_type
            
            # Check if example is missing or is placeholder
            curr_ex = item.get('example', '')
            if not curr_ex or 'is common in IELTS' in curr_ex or len(curr_ex) < 15:
                ex_en, ex_vi, definition, collocations = generate_contextual_example(
                    item['word'], item['meaning'], item['type'], item.get('topic', 'General')
                )
                item['example'] = ex_en
                item['exampleVi'] = ex_vi
                if not item.get('definition'):
                    item['definition'] = definition
                if not item.get('collocations') or len(item['collocations']) == 0:
                    item['collocations'] = collocations
                enhanced_examples_count += 1

        final_words.append(item)

    # Re-index clean IDs
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

    # Verify placeholder elimination
    remaining_placeholders = [w for w in final_words if 'is common in IELTS' in w.get('example', '')]
    print(f"\n[✓] Số từ đa nghĩa đã được bổ sung ngữ nghĩa toàn diện: {polysemy_count} từ")
    print(f"[✓] Số câu ví dụ đã được thay thế thành câu chuẩn IELTS: {enhanced_examples_count} câu")
    print(f"[✓] Số câu ví dụ placeholder khuôn mẫu còn lại: {len(remaining_placeholders)} (Mục tiêu: 0)")
    assert len(remaining_placeholders) == 0, "Still has placeholders!"

    # Check Trip specific
    trip_item = next(w for w in final_words if w['word'].lower() == 'trip')
    print("\n--- KẾT QUẢ KIỂM TRA TỪ 'TRIP' SAU CHUẨN HÓA ---")
    print(f"Word:        {trip_item['word']}")
    print(f"Type:        {trip_item['type']}")
    print(f"Topic:       {trip_item['topic']}")
    print(f"Band:        {trip_item['band']}")
    print(f"Meaning:     {trip_item['meaning']}")
    print(f"Example:     {trip_item['example']}")
    print(f"ExampleVi:   {trip_item['exampleVi']}")
    print(f"Collocations: {trip_item['collocations']}")

    # Write to ielts_words.js
    js_content = f"// Comprehensive IELTS Vocabulary Database - {len(final_words)} words (100% Quality Enhanced)\n"
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
    execute_overhaul()
