import Image from "next/image";
import { DINNER_MENU, DINNER_VENUE_PHOTO } from "@/lib/myeo-dinner";
import { Reveal } from "@/components/Reveal";

// The dinner's menu on the public event page: the NÚC dining room photo on the
// left, one numbered card per course on the right, and the allergy reminder
// under the list. The two columns stack on a phone. The blurb on the board
// carries the fee and the cut-off; the courses live here so they stay readable.
export function MyeoDinnerMenu() {
  return (
    <section className="section section--tight">
      <div className="container">
        <Reveal>
          <span className="eyebrow eyebrow--accent">Menu</span>
          <h2 className="display-3" style={{ marginTop: 12, marginBottom: 32 }}>
            Seven courses at NÚC Kitchen and Bar
          </h2>
          <div className="myeo-menu-layout">
            <div className="myeo-menu__photo-wrap">
              <Image
                className="myeo-menu__photo"
                src={DINNER_VENUE_PHOTO.src}
                alt={DINNER_VENUE_PHOTO.alt}
                fill
                sizes="(max-width: 900px) 92vw, 45vw"
                unoptimized
              />
            </div>
            <div>
              <ol className="myeo-menu">
                {DINNER_MENU.map((course, index) => (
                  <li key={course.name} className="myeo-menu__course">
                    <span className="myeo-menu__num" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="myeo-menu__name">{course.name}</h3>
                      <p className="myeo-menu__items">{course.ingredients.join(" · ")}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="myeo-menu__note">
                Please add any food allergies or dietary needs in the registration form.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
