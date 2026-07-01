export type VideoCard = {
  id: string;
  title: string;
  audience: string;
  problem: string;
  solution: string;
  video: string;
  poster: string;
};

export const videoCards: VideoCard[] = [
  {
    id: "clinic-queue-problem",
    title: "Clinic Queue Problem",
    audience: "Clinic / hospital front desk",
    problem: "Patients wait too long to ask simple product or supplement questions.",
    solution:
      "VitaKiosk provides general product education before the counter and escalates professional cases to staff.",
    video: "/assets/videos/clinic-queue-problem.mp4",
    poster: "/assets/posters/clinic-queue-problem.jpg",
  },
  {
    id: "pharmacy-partner-discovery",
    title: "Pharmacy Partner Discovery",
    audience: "Retail pharmacy + clinic/hospital partner",
    problem:
      "Customers may leave a clinic interested in a supplement or product but do not know where to buy it.",
    solution:
      "VitaKiosk shows participating pharmacy partner information, QR directions, and campaign redemption.",
    video: "/assets/videos/pharmacy-partner-discovery.mp4",
    poster: "/assets/posters/pharmacy-partner-discovery.jpg",
  },
  {
    id: "retail-pharmacy-promo",
    title: "Retail Pharmacy Promotion",
    audience: "Retail pharmacy",
    problem: "Promotions are available but not explained consistently.",
    solution:
      "VitaKiosk displays sponsored product education and promotion content clearly.",
    video: "/assets/videos/retail-pharmacy-promo.mp4",
    poster: "/assets/posters/retail-pharmacy-promo.jpg",
  },
  {
    id: "ai-website-studio",
    title: "AI Website Studio",
    audience: "SME / clinic / pharmacy / service business",
    problem:
      "A website that only looks nice but does not capture leads is not enough.",
    solution:
      "AI-ready websites explain services, collect leads, and support automation.",
    video: "/assets/videos/ai-website-studio.mp4",
    poster: "/assets/posters/ai-website-studio.jpg",
  },
  {
    id: "ai-training",
    title: "AI Training",
    audience: "Business owner / team",
    problem: "Teams use AI randomly without workflow.",
    solution:
      "VitaKiosk Asia teaches practical AI workflows for business, pharmacy, and content automation.",
    video: "/assets/videos/ai-training.mp4",
    poster: "/assets/posters/ai-training.jpg",
  },
];
