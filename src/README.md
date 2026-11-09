# CaterHub `src` folder map

Find any page by its address (URL) and open the file next to it.

## Public pages (anyone)
| Page | URL | File |
|---|---|---|
| Home / How it works | `/` | `public/Home.jsx` |
| Browse caterers (+ filters) | `/caterers` | `public/CatererList.jsx`, filter box: `public/FilterForm.jsx` |
| Caterer profile (address, map, availability) | `/caterer/:id` | `public/CatererProfile.jsx` |
| Package details | `/package/:id` | `public/PackageDetail.jsx` |
| Log in | `/login` | `auth/Login.jsx` |
| Sign up | `/signup` | `auth/Signup.jsx` |

## Customer pages (logged in as Customer)
| Page | URL | File |
|---|---|---|
| Send an inquiry | `/inquire/:id` | `customer/SendInquiry.jsx` |
| My inquiries (calendar + history) | `/my` | `customer/MyInquiries.jsx` |
| Notifications (select, clear, reply) | `/notes` | `customer/Notifications.jsx` → list in `shared/NotificationsList.jsx` |

## Owner pages (logged in as Caterer Owner)
The sidebar and tab switching are in `owner/OwnerLayout.jsx`.
| Tab | URL | File |
|---|---|---|
| Dashboard | `/owner` | `owner/Dashboard.jsx` |
| Inquiries & availability (calendar) | `/owner/inq` | `owner/Inquiries.jsx` |
| Packages | `/owner/pk` | `owner/Packages.jsx`, form: `owner/PackageForm.jsx`, menu/photos: `owner/PackageExtras.jsx` |
| Business Profile | `/owner/pf` | `owner/BusinessProfile.jsx` |
| Notifications | `/owner/nt` | `shared/NotificationsList.jsx` |

## Shared code
| File | What it is |
|---|---|
| `App.jsx` | The list of all pages (routes) |
| `main.jsx` | Starts the app |
| `shared/Header.jsx` | Top menu bar |
| `shared/supabase.js` | Database connection |
| `shared/AuthContext.jsx` | Login / who is logged in |
| `shared/lib.jsx` | Small helpers (dates, peso, toast messages, loading) |
| `shared/AvailCalendar.jsx` | Caterer availability calendar |
| `styles.css` | All the styling (one file, because later rules override earlier ones) |
| `owner/constants.js` | Owner tab names and inquiry statuses |
| `public/mapLinks.js`, `public/Chips.jsx` | Small pieces used by the public pages |
| `auth/AuthParts.jsx` | Shared parts of the login and sign-up pages |
