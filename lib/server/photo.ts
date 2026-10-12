// 프로필 사진 주소. ?v=파일명을 붙여 사진을 바꾸면 브라우저 캐시도 새로 받게 한다.
export const photoUrl = (userId: string, photo: string | null) => (photo ? `/api/profile-photo/${userId}?v=${encodeURIComponent(photo)}` : null);
