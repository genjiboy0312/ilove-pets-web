import type {
  Activity,
  ActivityId,
  CommentId,
  Pet,
  PetId,
  Post,
  PostComment,
  PostId,
  User,
  UserId,
} from "../types/domain"

export const CURRENT_USER_ID = "user_current"

export const mockUsersById = {
  user_current: {
    id: "user_current",
    username: "mira",
    displayName: "Mira Han",
    profileImageUrl: "https://images.example.com/users/mira.jpg",
    bio: "Weekend foster and reptile keeper.",
    followerCount: 128,
    followingCount: 46,
  },
  user_arden: {
    id: "user_arden",
    username: "arden",
    displayName: "Arden Lee",
    profileImageUrl: "https://images.example.com/users/arden.jpg",
    bio: "Bird watcher with a senior cat.",
    followerCount: 92,
    followingCount: 64,
  },
  user_solana: {
    id: "user_solana",
    username: "solana",
    displayName: "Solana Park",
    profileImageUrl: "https://images.example.com/users/solana.jpg",
    bio: "Small animal rescue volunteer.",
    followerCount: 214,
    followingCount: 88,
  },
} as const satisfies Record<UserId, User>

export const mockPetsById = {
  pet_bori: {
    id: "pet_bori",
    ownerId: "user_current",
    name: "Bori",
    category: "DOG",
    breed: "Jindo mix",
    profileImageUrl: "https://images.example.com/pets/bori.jpg",
    bio: "Trail runner and snack negotiator.",
  },
  pet_miso: {
    id: "pet_miso",
    ownerId: "user_current",
    name: "Miso",
    category: "REPTILE",
    breed: "Leopard gecko",
    profileImageUrl: "https://images.example.com/pets/miso.jpg",
    bio: "Warm-rock specialist.",
  },
  pet_nori: {
    id: "pet_nori",
    ownerId: "user_arden",
    name: "Nori",
    category: "CAT",
    breed: "Korean shorthair",
    profileImageUrl: "https://images.example.com/pets/nori.jpg",
    bio: "Window supervisor.",
  },
  pet_kiki: {
    id: "pet_kiki",
    ownerId: "user_arden",
    name: "Kiki",
    category: "BIRD",
    breed: "Cockatiel",
    profileImageUrl: "https://images.example.com/pets/kiki.jpg",
    bio: "Morning whistle composer.",
  },
  pet_tofu: {
    id: "pet_tofu",
    ownerId: "user_solana",
    name: "Tofu",
    category: "SMALL_ANIMAL",
    breed: "Dwarf hamster",
    profileImageUrl: "https://images.example.com/pets/tofu.jpg",
    bio: "Cardboard tunnel architect.",
  },
  pet_pebble: {
    id: "pet_pebble",
    ownerId: "user_solana",
    name: "Pebble",
    category: "ETC",
    breed: "Goldfish",
    profileImageUrl: "https://images.example.com/pets/pebble.jpg",
    bio: "Bubble patrol captain.",
  },
} as const satisfies Record<PetId, Pet>

export const mockPostsById = {
  post_bori_hike: {
    id: "post_bori_hike",
    petId: "pet_bori",
    imageUrl: "https://images.example.com/posts/bori-hike.jpg",
    content: "New ridge route approved by Bori.",
    tags: ["hike", "dog", "weekend"],
    likedByUserIds: ["user_arden", "user_solana"],
    commentCount: 3,
    createdAt: "2026-08-18T09:15:00.000Z",
  },
  post_miso_sun: {
    id: "post_miso_sun",
    petId: "pet_miso",
    imageUrl: "https://images.example.com/posts/miso-sun.jpg",
    content: "Miso found the best afternoon sun patch.",
    tags: ["reptile", "gecko"],
    likedByUserIds: ["user_solana"],
    commentCount: 1,
    createdAt: "2026-08-18T11:30:00.000Z",
  },
  post_kiki_song: {
    id: "post_kiki_song",
    petId: "pet_kiki",
    imageUrl: "https://images.example.com/posts/kiki-song.jpg",
    content: "Kiki rehearsed a breakfast melody.",
    tags: ["bird", "song"],
    likedByUserIds: ["user_current"],
    commentCount: 2,
    createdAt: "2026-08-17T22:05:00.000Z",
  },
  post_tofu_tunnel: {
    id: "post_tofu_tunnel",
    petId: "pet_tofu",
    imageUrl: "https://images.example.com/posts/tofu-tunnel.jpg",
    content: "Tofu inspected the new tunnel system.",
    tags: ["hamster", "small-animal"],
    likedByUserIds: ["user_current", "user_arden"],
    commentCount: 4,
    createdAt: "2026-08-16T14:45:00.000Z",
  },
} as const satisfies Record<PostId, Post>

export const mockActivitiesById = {
  activity_like_bori_hike: {
    id: "activity_like_bori_hike",
    type: "LIKE",
    actorId: "user_arden",
    postId: "post_bori_hike",
    createdAt: "2026-08-18T10:00:00.000Z",
  },
  activity_comment_miso_sun: {
    id: "activity_comment_miso_sun",
    type: "COMMENT",
    actorId: "user_solana",
    postId: "post_miso_sun",
    commentPreview: "That color is perfect.",
    createdAt: "2026-08-18T12:10:00.000Z",
  },
  activity_follow_current: {
    id: "activity_follow_current",
    type: "FOLLOW",
    actorId: "user_arden",
    targetUserId: "user_current",
    createdAt: "2026-08-18T13:25:00.000Z",
  },
} as const satisfies Record<ActivityId, Activity>

export const mockCommentsById = {
  comment_bori_hike_1: {
    id: "comment_bori_hike_1",
    postId: "post_bori_hike",
    authorId: "user_arden",
    content: "Bori really earned that ridge view.",
    createdAt: "2026-08-18T09:30:00.000Z",
  },
  comment_bori_hike_2: {
    id: "comment_bori_hike_2",
    postId: "post_bori_hike",
    authorId: "user_solana",
    content: "That trail looks perfect for a weekend.",
    createdAt: "2026-08-18T09:45:00.000Z",
  },
  comment_bori_hike_3: {
    id: "comment_bori_hike_3",
    postId: "post_bori_hike",
    authorId: "user_current",
    content: "Next time we bring snacks.",
    createdAt: "2026-08-18T10:00:00.000Z",
  },
  comment_miso_sun_1: {
    id: "comment_miso_sun_1",
    postId: "post_miso_sun",
    authorId: "user_solana",
    content: "That color is perfect.",
    createdAt: "2026-08-18T12:10:00.000Z",
  },
  comment_kiki_song_1: {
    id: "comment_kiki_song_1",
    postId: "post_kiki_song",
    authorId: "user_current",
    content: "Breakfast melody is officially catchy.",
    createdAt: "2026-08-17T22:30:00.000Z",
  },
  comment_kiki_song_2: {
    id: "comment_kiki_song_2",
    postId: "post_kiki_song",
    authorId: "user_arden",
    content: "Kiki has perfect pitch.",
    createdAt: "2026-08-17T22:45:00.000Z",
  },
  comment_tofu_tunnel_1: {
    id: "comment_tofu_tunnel_1",
    postId: "post_tofu_tunnel",
    authorId: "user_current",
    content: "Tofu is the chief inspector now.",
    createdAt: "2026-08-16T15:00:00.000Z",
  },
  comment_tofu_tunnel_2: {
    id: "comment_tofu_tunnel_2",
    postId: "post_tofu_tunnel",
    authorId: "user_arden",
    content: "Cardboard budget approved.",
    createdAt: "2026-08-16T15:20:00.000Z",
  },
  comment_tofu_tunnel_3: {
    id: "comment_tofu_tunnel_3",
    postId: "post_tofu_tunnel",
    authorId: "user_solana",
    content: "Tunnel system looks professionally done.",
    createdAt: "2026-08-16T15:40:00.000Z",
  },
  comment_tofu_tunnel_4: {
    id: "comment_tofu_tunnel_4",
    postId: "post_tofu_tunnel",
    authorId: "user_current",
    content: "More tunnels coming this weekend.",
    createdAt: "2026-08-16T16:00:00.000Z",
  },
} as const satisfies Record<CommentId, PostComment>

export const mockCommentIds = [
  "comment_bori_hike_1",
  "comment_bori_hike_2",
  "comment_bori_hike_3",
  "comment_miso_sun_1",
  "comment_kiki_song_1",
  "comment_kiki_song_2",
  "comment_tofu_tunnel_1",
  "comment_tofu_tunnel_2",
  "comment_tofu_tunnel_3",
  "comment_tofu_tunnel_4",
] as const satisfies readonly CommentId[]

export const mockPetIds = [
  "pet_bori",
  "pet_miso",
  "pet_nori",
  "pet_kiki",
  "pet_tofu",
  "pet_pebble",
] as const satisfies readonly PetId[]

export const mockPostIds = [
  "post_bori_hike",
  "post_miso_sun",
  "post_kiki_song",
  "post_tofu_tunnel",
] as const satisfies readonly PostId[]

export const mockActivityIds = [
  "activity_like_bori_hike",
  "activity_comment_miso_sun",
  "activity_follow_current",
] as const satisfies readonly ActivityId[]
