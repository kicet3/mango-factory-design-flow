-- Seed initial data for reference tables
-- This migration handles identity columns properly
set search_path = public;

begin;

-- course_semesters (BY DEFAULT identity)
insert into public.course_semesters (course_semester_id, course_semester_name, course_semester_desc) 
overriding system value values
  (1, '1학기', NULL),
  (2, '2학기', NULL),
  (3, '1, 2학기 공통', NULL),
  (4, '겨울학기', '방학 집중')
on conflict (course_semester_id) do nothing;

-- course_types (BY DEFAULT identity)
insert into public.course_types (course_type_id, course_type_name, course_type_desc) 
overriding system value values
  (1, '국어', '국어수업'),
  (2, '수학', '수학수업'),
  (3, '사회', '사회수업'),
  (4, '과학', '과학수업'),
  (5, '영어', '영어수업'),
  (6, '통합교과', '통합교과'),
  (7, '기타', '기타 교과')
on conflict (course_type_id) do nothing;

-- cowork_types (BY DEFAULT identity)
insert into public.cowork_types (cowork_type_id, cowork_type_name, cowork_type_desc) 
overriding system value values
  (1, '개별활동', '학생이 혼자서 독립적으로 진행하는 활동, 혹은 교사가 주도하는 활동'),
  (2, '짝 활동', '두 명씩 짝을 지어 협력적으로 진행하는 활동'),
  (3, '모둠 활동', '여러 명의 학생이 모여 그룹 단위로 협동적으로 진행하는 활동'),
  (4, '전체', '학급 전체')
on conflict (cowork_type_id) do nothing;

-- help_request_types (BY DEFAULT identity)
insert into public.help_request_types (help_request_type_id, help_request_type_name, help_request_type_desc) 
overriding system value values
  (1, '기술 문의', '기술 관련 문의'),
  (2, '결제 문의', '결제 관련 문의'),
  (3, '기능 문의', '기능 관련 문의'),
  (4, '버그 신고', '버고 발생 문의'),
  (5, '계정/로그인', '계정 관련 문의'),
  (6, '교과서/수업자료 등록', '유저가 등록하고 싶은 교과서나 수업자료를 올리려면 여기로 문의주시면 됨'),
  (7, '기타 문의', '기타')
on conflict (help_request_type_id) do nothing;

-- payment_status (ALWAYS identity - requires OVERRIDING SYSTEM VALUE)
insert into public.payment_status (payment_status_id, payment_status_name, payment_status_desc) 
overriding system value values
  (1, 'INIT', '결제 시도(진행중)'),
  (2, 'SUCCESS', '결제 완료/승인 성공'),
  (3, 'CANCEL', '결제 취소(승인 후 취소/환불 포함)'),
  (4, 'FAIL', '결제 실패(승인 실패 등)'),
  (5, 'EXPIRED', '결제 시도 후 제한시간 초과/결제 요청 만료'),
  (6, 'PARTIAL_REFUND', '부분 환불')
on conflict (payment_status_id) do nothing;

-- plans (BY DEFAULT identity)
insert into public.plans (plan_id, plan_name, weekly_credit, plan_desc) 
overriding system value values
  (1, 'Free plan', 3, '처음 가입하자마자 기본적으로 부여되는 plan, 유료 플랜이 끝났을 때도 이걸 사용 '),
  (2, 'Pro plan', 200, '유료 회원'),
  (3, 'School/Enterprise plan', 200, '학교나 B2B거래로 판매한 플랜')
on conflict (plan_id) do nothing;

-- generation_status_types (BY DEFAULT identity)
insert into public.generation_status_types (generation_status_type_id, generation_status_type_name, generation_status_type_desc) 
overriding system value values
  (1, '생성 요청', '웹에서 생성 요청 보냄'),
  (2, '생성 중', '서버에서 데이터 확인, 생성 시작'),
  (3, '생성 실패', '생성 완료되지 못하고 실패'),
  (4, '생성 완료', '생성이 정상적으로 완료됨, 데이터 올라감')
on conflict (generation_status_type_id) do nothing;
--
-- Ensure a unique constraint exists for ON CONFLICT to work
create unique index if not exists teaching_styles_teaching_style_id_key
on public.teaching_styles (teaching_style_id);

-- teaching_styles (BY DEFAULT identity)
insert into public.teaching_styles (teaching_style_id, teaching_style_name, teaching_style_desc, open_status) 
overriding system value values
  (1, '교과서 중심수업', '특별한 규칙이 있는 활동 보다는 도입(학습을 위한 동기유발) - 전개(교과서 내용대로 진행해 이 수업자료로 수업을 하면 해당 교과서 분량을 다 완성) - 정리(간단한 복습이나 다음 수업 예고)로 이루어진 수업', true),
  (2, '토론 및 협력', '짝과 말하기, 짝 (협력, 경쟁) 활동, 모둠과 말하기, 모둠 활동 등 다른 학생들과 대화를 하거나 같이 협력하는 활동', true),
  (3, '프로젝트 기반', '문제 해결/프로젝트 중심', true),
  (4, '만들기 및 제작 활동', '만들기 도안을 완성하거나 자신의(모둠의) 아이디어를 기획해 구체화하는 활동으로 결과물이 존재(공유, 전시 가능한 산출물)', true),
  (5, '게임 기반 활동', '게임 요소를 활용하여 흥미와 참여도를 높이는 방식', true),
  (6, '선호 스타일 없음', '별도의 선호 스타일이 없어 모두 포괄적으로 활용하는 경우 선택', true)
on conflict (teaching_style_id) do nothing;

commit;