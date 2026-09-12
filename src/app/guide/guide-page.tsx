import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { STATUS_GLOSSARY } from "@/data/status-glossary";
import { GAME_FACTS } from "@/data/game-facts";
import { ONLINE_DPS_CORE } from "@/data/meta";
import { AbilityText } from "@/components/ability-text";
import { Disclosure } from "@/components/disclosure";
import { TroopIcon } from "@/components/troop-icon";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  COMP_ROLES,
  roleChipClass,
  roleLabels,
  roleShort,
} from "@/lib/roles";
import {
  MODES,
  RARITIES,
  SLOTS,
  TROOP_TYPES,
  breedChipClass,
  breedLabels,
  breedRoles,
  modeCopy,
  modeLabels,
  rarityLabels,
  slotHints,
  slotLabels,
  statLabels,
  statShort,
  troopCounters,
  troopLabels,
} from "@/lib/labels";
import { BREEDS } from "@/lib/labels";
import { STAT_BAR_CLASS, STAT_TEXT_CLASS } from "@/lib/ability-text";
import {
  GUIDE_SECTIONS,
  GUIDE_SOURCE,
  HABIT_GATES,
  HABIT_RANKS,
  HABIT_SLOTS,
  LEVEL_CAP,
  MAX_REIGN,
  MAX_STARS,
  RARITY_SCALING,
  STAR_STEPS,
  TROOPS_MAX,
  TROOPS_PER_LEVEL,
  kitLine,
  levelThatCapsTroops,
  starStatBonusPct,
  workedExample,
} from "@/lib/guide";
import type { KitLine } from "@/lib/guide";
import { cn } from "@/lib/utils";

const num = (n: number) => n.toLocaleString("en-US");

function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 sm:scroll-mt-20">
      <h2 className="font-heading text-xl tracking-wide text-amber-100 sm:text-2xl">
        {title}
      </h2>
      {lede ? (
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{lede}</p>
      ) : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-[15px] leading-relaxed">{children}</p>;
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card/70 p-3 ring-1 ring-foreground/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Quotes an ability straight out of the catalog, so an example can never drift
 * from the game or lose a sentence to a hand-copied excerpt.
 */
function KitQuote({ line }: { line: KitLine | null }) {
  if (!line) return null;
  return (
    <figure className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
      <blockquote className="text-sm leading-relaxed">
        <AbilityText text={line.text} />
      </blockquote>
      <figcaption className="text-label mt-1.5">{line.who}</figcaption>
    </figure>
  );
}

function SectionLinks({ stacked }: { stacked?: boolean }) {
  return (
    <>
      {GUIDE_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            "inline-flex min-h-10 items-center text-[13px] text-foreground/75 hover:bg-muted hover:text-foreground",
            stacked
              ? "rounded-lg px-2"
              : "rounded-full px-2.5 ring-1 ring-foreground/15",
          )}
        >
          {section.title}
        </a>
      ))}
    </>
  );
}

function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-3xl rounded-xl border-l-2 border-amber-400/70 bg-amber-500/10 px-3 py-2 text-[15px] leading-relaxed text-amber-50">
      {children}
    </p>
  );
}

export function GuidePage() {
  const example = workedExample("vhagar");
  const legendary = RARITY_SCALING.find((row) => row.rarity === "legendary");
  const capLevel = levelThatCapsTroops("legendary", MAX_STARS);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
          Dragonfire, from the beginning
        </h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          What the four stats actually do, why cutting the damage you take is
          worth more than it looks, and what star rank and reign level really
          buy you. Every number here is read out of the same catalog the rest
          of this site uses, so nothing below is a guess.
        </p>
        {/* Fourteen chips stacked is most of a phone screen, so small screens
            get the same list folded away instead of a wall to scroll past. */}
        <nav aria-label="Sections" className="hidden flex-wrap gap-1.5 pt-1 sm:flex">
          <SectionLinks />
        </nav>
        <div className="pt-1 sm:hidden">
          <Disclosure
            title="Jump to a section"
            badge={`${GUIDE_SECTIONS.length}`}
          >
            <div className="flex flex-col gap-1">
              <SectionLinks stacked />
            </div>
          </Disclosure>
        </div>
      </header>

      <Section
        id="line"
        title="A line is three dragons"
        lede="Everything else in the game hangs off this shape, so it is worth getting straight first."
      >
        <P>
          You fight with three dragons at a time, in three fixed seats. The
          middle seat is the Vanguard and it is where the hits land. The two
          outer seats are flanks, and they are where the support and the
          finishers sit.
        </P>
        <div className="grid gap-2 sm:grid-cols-3">
          {SLOTS.map((slot) => (
            <Panel
              key={slot}
              className={cn(
                slot === "vanguard" && "ring-amber-400/40 bg-amber-500/10",
              )}
            >
              <p
                className={cn(
                  "text-label",
                  slot === "vanguard" && "text-amber-200",
                )}
              >
                {slotLabels[slot]}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{slotHints[slot]}</p>
            </Panel>
          ))}
        </div>
        <P>
          The seat is not just a position on screen. Every dragon has a
          separate <strong>Vanguard skill</strong> that only fires when that
          dragon is standing in the Vanguard, and it usually buffs one named
          flank. Vhagar is the clearest example:
        </P>
        <KitQuote line={kitLine("vhagar", { kind: "vanguard" })} />
        <P>
          Read that twice. Vhagar only takes less damage while it is in the
          Vanguard, and the ally it helps is specifically the one on the Left.
          That is why lines are written as three seats rather than three names
          — moving a dragon one seat over can switch its whole contribution
          off.
        </P>
        <Panel>
          <p className="text-label mb-1.5">Facts worth memorising</p>
          <ul className="space-y-1.5 text-sm leading-relaxed">
            {GAME_FACTS.map((fact) => (
              <li key={fact} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400/80" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Section>

      <Section
        id="stats"
        title="The four stats, and what they do"
        lede="Strength, Instinct, Intelligence, Initiative. Four numbers, two separate jobs."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              "strength",
              "instinct",
              "intelligence",
              "initiative",
            ] as const
          ).map((key) => (
            <Panel key={key}>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-heading text-lg tracking-wide",
                    STAT_TEXT_CLASS[key],
                  )}
                >
                  {statLabels[key]}
                </span>
                <span className="text-label">{statShort[key]}</span>
              </div>
              <div
                className={cn(
                  "mt-2 h-1.5 rounded-full",
                  STAT_BAR_CLASS[key],
                )}
              />
            </Panel>
          ))}
        </div>
        <P>
          <strong>Job one: they are the dragon&rsquo;s raw combat numbers.</strong>{" "}
          The catalog stores a different set of four for every reign level, and
          your star rank then multiplies all four together. That is the part
          most players think of as &ldquo;getting stronger&rdquo;.
        </P>
        <P>
          <strong>
            Job two, and the one beginners miss: stats decide how big your
            abilities are.
          </strong>{" "}
          Kit text keeps saying <em>enhanced by</em> and then names a stat. That
          phrase means the size of that specific effect scales off that stat on
          the dragon casting it.
        </P>
        <div className="grid gap-2 lg:grid-cols-2">
          <KitQuote
            line={kitLine("rhysarion", { kind: "habit", habit: 3, rank: 1 })}
          />
          <KitQuote
            line={kitLine("kalspire", { kind: "habit", habit: 2, rank: 1 })}
          />
        </div>
        <P>
          So Rhysarion&rsquo;s healing gets bigger as its Intelligence grows,
          and Kalspire&rsquo;s debuff bites harder as its Instinct grows. A
          healer with poor Intelligence is a worse healer, even though nothing
          on the card says &ldquo;healing power&rdquo;. This is the honest
          answer to &ldquo;why should I level a support dragon?&rdquo;
        </P>
        <Takeaway>
          Raising a stat does two things at once: it raises the plain combat
          number, and it inflates every ability on that dragon that is enhanced
          by it. That is why growth compounds instead of adding up.
        </Takeaway>
        <Panel className="border-l-2 border-muted-foreground/40">
          <p className="text-sm leading-relaxed text-muted-foreground">
            One caveat, so you are not misled: the catalog records{" "}
            <em>which</em> stat enhances an effect, not the conversion rate. So
            this site shows you the stat and the listed percentage, and it will
            not pretend to compute a single combined output number.
          </p>
        </Panel>
      </Section>

      <Section
        id="damage"
        title="Damage, and damage mitigation"
        lede="The most under-rated stat line in the game is the one that reduces what you take."
      >
        <P>
          Damage in Dragonfire comes in three flavours —{" "}
          <AbilityText text="Physical Damage" />,{" "}
          <AbilityText text="Fire Damage" /> and{" "}
          <AbilityText text="Tactical Damage" /> — and every one of them has two
          sides to it:
        </P>
        <div className="grid gap-2 sm:grid-cols-2">
          <Panel>
            <p className="text-label">Damage Dealt</p>
            <p className="mt-1 text-sm leading-relaxed">
              How hard you hit. Raising it makes your attacks bigger.
            </p>
          </Panel>
          <Panel className="ring-cyan-400/30 bg-cyan-500/10">
            <p className="text-label text-cyan-200">Damage Received</p>
            <p className="mt-1 text-sm leading-relaxed">
              How hard the enemy hits <em>you</em>. Lowering it is what people
              mean by damage mitigation.
            </p>
          </Panel>
        </div>
        <P>
          Mitigation shows up under a lot of different names. In the
          keyword list, <AbilityText text="Resistance" /> is the buff that{" "}
          <em>reduces the target&rsquo;s Damage Received</em>, and{" "}
          <AbilityText text="Vulnerable" /> is the debuff that increases it. Kit
          text also cuts Damage Received directly, and{" "}
          <AbilityText text="Bulwark" /> stacks do both at once:
        </P>
        <div className="grid gap-2 lg:grid-cols-2">
          <KitQuote
            line={kitLine("vhagar", { kind: "habit", habit: 5, rank: 1 })}
          />
          <KitQuote
            line={kitLine("vhagar", { kind: "habit", habit: 5, rank: HABIT_RANKS })}
          />
        </div>
        <P>
          Those two are the same habit at rank 1 and rank {HABIT_RANKS}. The
          effect never changes shape — it is the numbers inside it that grow.
          That is what ranking a habit buys you, and it is why a habit you own
          but never rank up is doing a fraction of its job.
        </P>
        <h3 className="font-heading pt-1 text-lg tracking-wide">
          Why mitigation is worth more than it looks
        </h3>
        <P>
          A damage buff pays out once per attack you make. Mitigation pays out
          on <em>every single hit that comes at you</em>, for as long as it
          lasts. Fights here run over multiple rounds against three enemies, so
          the number of incoming hits is large — and each one is smaller.
        </P>
        <P>
          It also decides whether your healer can keep up. Recovery has to
          out-run incoming damage. Cutting the damage you take does not just
          save health, it makes every point of healing you already had go
          further. Mitigation and Recovery multiply each other; two healers do
          not.
        </P>
        <h3 className="font-heading pt-1 text-lg tracking-wide">
          Taunt is what makes it pay
        </h3>
        <P>
          Mitigation on the wrong dragon is wasted, because the enemy is free
          to attack somebody squishier.{" "}
          <AbilityText text="Taunt" /> fixes that: it{" "}
          <em>
            forces the target to launch their Basic Attacks against this dragon
          </em>
          . Put the mitigation and the Taunt on the same dragon, stand it in the
          Vanguard, and you have deliberately funnelled the whole enemy line
          into your most armoured target.
        </P>
        <KitQuote line={kitLine("vhagar", { kind: "command" })} />
        <P>
          That is the entire reason the community core looks the way it does.
          The site&rsquo;s own note on it reads:
        </P>
        <Panel>
          <p className="text-sm leading-relaxed">{ONLINE_DPS_CORE.why}</p>
          <p className="text-label mt-1.5">
            {ONLINE_DPS_CORE.name} · {troopLabels[ONLINE_DPS_CORE.troop]}
          </p>
        </Panel>
        <Takeaway>
          A soak dragon that cuts its own Damage Received and Taunts is doing
          more for your line than a third damage dealer. Build the Vanguard
          first.
        </Takeaway>
      </Section>

      <Section
        id="keywords"
        title="Every keyword, in plain words"
        lede="These are the in-game keyword lines, straight from the Star Progression screens. If a habit mentions one of these, this is exactly what it does."
      >
        <Panel className="p-0">
          <dl className="divide-y divide-border/50">
            {Object.entries(STATUS_GLOSSARY).map(([name, meaning]) => (
              <div
                key={name}
                className="grid gap-0.5 px-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3"
              >
                <dt className="text-sm font-medium text-amber-100">
                  <AbilityText text={name} />
                </dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  <AbilityText text={meaning} />
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </Section>

      <Section
        id="stars"
        title="Star rank: the biggest multiplier you control"
        lede={`Stars run 1 to ${MAX_STARS}. They multiply all four stats at once, and they unlock your habit slots.`}
      >
        <P>
          Star rank does not add a flat bonus, it multiplies the stats your
          reign level has already built. Rarity decides how steep that curve
          is:
        </P>
        <Panel className="overflow-x-auto p-0">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">
              Stat bonus from star rank, by rarity
            </caption>
            <thead>
              <tr className="border-b border-border/60">
                <th scope="col" className="text-label px-3 py-2 text-left">
                  Rarity
                </th>
                {STAR_STEPS.map((star) => (
                  <th
                    key={star}
                    scope="col"
                    className="text-label px-1.5 py-2 text-right tabular-nums"
                  >
                    {star}★
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RARITIES.map((rarity) => (
                <tr key={rarity} className="border-b border-border/40">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-normal whitespace-nowrap"
                  >
                    {rarityLabels[rarity]}
                  </th>
                  {STAR_STEPS.map((star) => {
                    const pct = starStatBonusPct(rarity, star);
                    return (
                      <td
                        key={star}
                        className={cn(
                          "px-1.5 py-2 text-right tabular-nums",
                          star === MAX_STARS && "font-medium text-amber-100",
                        )}
                      >
                        {pct === 0 ? "—" : `+${pct}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        {legendary ? (
          <Takeaway>
            A Legendary at {MAX_STARS}★ has{" "}
            <strong>+{legendary.maxStatBonusPct}% stats</strong> compared to the
            same dragon at 1★ — its four numbers are tripled before reign level
            is even counted. Nothing else you can do to one dragon comes close.
          </Takeaway>
        ) : null}
        <P>
          Stars have a second job too. They open your five habit slots at{" "}
          {HABIT_GATES.map((gate, i) => (
            <span key={gate}>
              {i > 0 ? (i === HABIT_GATES.length - 1 ? " and " : ", ") : ""}
              <strong>{gate}★</strong>
            </span>
          ))}
          . Every even star rank is a new ability, which is why the jump from an
          odd star to an even one often feels bigger than the stat bump alone.
        </P>
      </Section>

      <Section
        id="reign"
        title="Reign level, troops, and the level cap"
        lede="Star rank is the multiplier. Reign level is the base it multiplies."
      >
        <P>
          Reign level sets which row of base stats a dragon uses, and it is the
          only thing that decides how many troops that dragon leads. Troops are
          the soldiers marching under it: <strong>{num(TROOPS_PER_LEVEL)} per
          level</strong>, up to a hard ceiling of{" "}
          <strong>{num(TROOPS_MAX)}</strong>.
        </P>
        <P>
          Star rank adds a troop bonus on top, but it cannot raise that ceiling
          — it just gets you there sooner.
          {capLevel
            ? ` A Legendary at ${MAX_STARS}★ is already capped by reign level ${capLevel}, where a 1★ needs every level up to ${LEVEL_CAP}.`
            : ""}{" "}
          Troops matter because several habits read off them directly, like
          Vhagar&rsquo;s{" "}
          <AbilityText text="Advantage" /> roll that targets{" "}
          <em>the Ally with the most troops</em>.
        </P>
        <Panel className="border-l-2 border-muted-foreground/40">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Be aware of a seam here. The game lets a reign level run to{" "}
            {MAX_REIGN}, and this site will let you record that, but the catalog
            it reads only publishes stat, troop and power rows up to level{" "}
            {LEVEL_CAP}. Above {LEVEL_CAP} the numbers on this site stop moving.
            They are not wrong, they have simply run out of data.
          </p>
        </Panel>
      </Section>

      {example ? (
        <Section
          id="numbers"
          title="What growth is actually worth"
          lede={`The same dragon, ${example.name}, at the bottom and the top of both tracks. Nothing here is estimated — it is the catalog doing the arithmetic.`}
        >
          <Panel className="overflow-x-auto p-0">
            <table className="w-full min-w-[30rem] text-sm">
              <caption className="sr-only">
                {example.name} at 1★ level 1 versus {example.toStars}★ level{" "}
                {example.toLevel}
              </caption>
              <thead>
                <tr className="border-b border-border/60">
                  <th scope="col" className="text-label px-3 py-2 text-left">
                    {example.name} · {example.rarityLabel}
                  </th>
                  <th scope="col" className="text-label px-3 py-2 text-right">
                    {example.fromStars}★ · level {example.fromLevel}
                  </th>
                  <th scope="col" className="text-label px-3 py-2 text-right">
                    {example.toStars}★ · level {example.toLevel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {example.stats.map((row) => (
                  <tr key={row.key} className="border-b border-border/40">
                    <th
                      scope="row"
                      className={cn(
                        "px-3 py-2 text-left font-normal",
                        STAT_TEXT_CLASS[row.key],
                      )}
                    >
                      {row.label}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {num(row.base)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-amber-100">
                      {num(row.grown)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-border/40">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    Troops
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {num(example.troopsBefore)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-amber-100">
                    {num(example.troopsAfter)}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    Hub power
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {num(example.powerBefore)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-amber-100">
                    {num(example.powerAfter)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
          <Takeaway>
            That is roughly <strong>{example.statMultiple}× the stats</strong>{" "}
            and {Math.round(example.troopsAfter / example.troopsBefore)}× the
            troops, on the same dragon, for no change in kit. A fully grown
            common dragon beats a neglected famous one, every time.
          </Takeaway>
          <P>
            Which is the practical lesson for a new player: spreading resources
            thin across ten dragons leaves you with ten dragons that lose. Pick
            three, grow those three, and only then widen out.
          </P>
        </Section>
      ) : null}

      <Section
        id="habits"
        title="Habits: five slots you still have to buy"
        lede="Stars open the slot. They do not fill it."
      >
        <P>
          Each dragon has {HABIT_SLOTS} habit slots, gated behind{" "}
          {HABIT_GATES.join(", ")}★. Reaching the star rank only{" "}
          <em>unlocks</em> the slot — buying the habit is a separate step, which
          is why this site lets you tick each one off individually instead of
          assuming your stars tell the whole story.
        </P>
        <P>
          Each habit then upgrades through rank 1 to {HABIT_RANKS}, and the
          upgrade changes the numbers inside the text rather than the text
          itself. Vhagar&rsquo;s first habit reads &ldquo;-12%&rdquo; at rank 1
          and climbs from there, so a rank 5 habit is a materially different
          ability from a rank 1 one.
        </P>
        <Disclosure title="Why the site asks you to confirm each habit">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Because a line that assumes a habit you have not bought is a line
            that loses. If you mark a dragon 10★, this site starts by assuming
            all five habits are yours, and lets you untick the ones that are
            not. Those tick marks feed straight into what Copilot and Suggest
            recommend, so keeping them honest is worth the thirty seconds.
          </p>
        </Disclosure>
      </Section>

      <Section
        id="jobs"
        title="The four jobs a line needs"
        lede="Three dragons, four jobs. Something has to double up, and knowing which is the skill."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {COMP_ROLES.map((role) => (
            <Panel key={role}>
              <Badge
                variant="outline"
                className={cn("rounded-md font-normal", roleChipClass[role])}
              >
                {roleShort[role]}
              </Badge>
              <p className="mt-1.5 text-sm font-medium">{roleLabels[role]}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {role === "healing"
                  ? "Recovery that lands on your allies, not just on itself."
                  : role === "tanking"
                    ? "Taunt that drags attacks onto one dragon you have armoured."
                    : role === "damage"
                      ? "The dragon that actually finishes enemies off."
                      : "Stun, Panic, Slow, Stagger, Confusion — turns the enemy loses."}
              </p>
            </Panel>
          ))}
        </div>
        <P>
          A line with no healer melts. A line with no Taunt lets the enemy
          choose its victim. A line with no finisher survives forever and wins
          nothing. When this site says a line has a gap, it means one of these
          four is missing.
        </P>
        <Takeaway>
          Cover soak and healing before you chase a second damage dealer. Damage
          is the easiest job to fill and the least likely to be your problem.
        </Takeaway>
      </Section>

      <Section
        id="troops"
        title="Troop types and the tile triangle"
        lede="Free advantage, if you bother to check what you are marching into."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TROOP_TYPES.map((troop) => {
            const row = troopCounters[troop];
            return (
              <Panel key={troop}>
                <div className="flex items-center gap-2">
                  <TroopIcon troop={troop} className="size-5 text-amber-200" />
                  <span className="font-heading text-base tracking-wide">
                    {troopLabels[troop]}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {row.note}
                </p>
                {row.beats && row.losesTo ? (
                  <p className="mt-1.5 text-sm">
                    Beats {troopLabels[row.beats]} · loses to{" "}
                    {troopLabels[row.losesTo]}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    No place in the triangle.
                  </p>
                )}
              </Panel>
            );
          })}
        </div>
        <P>
          A dragon also has <strong>troop affinities</strong> — the troop types
          it is actually suited to lead. Matching your line&rsquo;s troop type
          to dragons that share an affinity for it is the cheapest upgrade
          available to a new player, because it costs nothing but attention.
        </P>
        <Takeaway>
          Check the enemy&rsquo;s troop type before you march. Winning the
          triangle is a bigger swing than one star rank, and it is free.
        </Takeaway>
      </Section>

      <Section
        id="modes"
        title="Modes want different lines"
        lede="The best line is only best for one job. Do not reuse your PvP three everywhere."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((mode) => (
            <Panel key={mode}>
              <p className="text-label">{modeLabels[mode]}</p>
              <p className="mt-1 text-sm leading-relaxed">{modeCopy[mode]}</p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section
        id="breeds"
        title="Rarity and breed"
        lede="Rarity sets your ceiling. Breed hints at the job."
      >
        <P>
          Rarity controls how hard your stars hit, as the table further up
          shows: at {MAX_STARS}★ a Legendary gets{" "}
          {starStatBonusPct("legendary", MAX_STARS)}% where a Rare gets{" "}
          {starStatBonusPct("rare", MAX_STARS)}%. That is the real difference
          between the tiers — not the artwork.
        </P>
        <div className="grid gap-2 sm:grid-cols-2">
          {BREEDS.map((breed) => (
            <Panel key={breed}>
              <Badge
                variant="outline"
                className={cn("rounded-md font-normal", breedChipClass[breed])}
              >
                {breedLabels[breed]}
              </Badge>
              <p className="mt-1.5 text-sm leading-relaxed">
                {breedRoles[breed]}
              </p>
            </Panel>
          ))}
        </div>
        <P>
          Breed is a strong hint, not a rule. Read the actual kit before you
          decide a dragon is your healer — this site derives jobs from what a
          dragon&rsquo;s abilities really do, not from its breed.
        </P>
      </Section>

      <Section
        id="plan"
        title="What to do first"
        lede="In priority order, based on the numbers above rather than on vibes."
      >
        <Panel className="p-0">
          <ol className="divide-y divide-border/50">
            {[
              {
                head: "Record what you own",
                body: "Set the star rank and reign level of your dragons in the Pit, and untick habits you have not bought. Everything this site suggests is only as good as that list.",
              },
              {
                head: "Pick three dragons, not ten",
                body: `Growth multiplies. One dragon taken up both tracks is worth several left at the bottom — the table above is a ${example ? `${example.statMultiple}×` : "large"} gap on a single name.`,
              },
              {
                head: "Build the Vanguard first",
                body: "A soak with Taunt and its own Damage Received reduction protects the other two. It is the seat that decides whether your line survives long enough to win.",
              },
              {
                head: "Get a real healer in",
                body: "Recovery that lands on allies, and then raise the stat that enhances it. A healer with low stats is a low heal.",
              },
              {
                head: "Then a finisher, on the flank your Vanguard feeds",
                body: "Read every flank your Vanguard names, because they need not agree. Vhagar's Vanguard skill sends Tactical damage Left, while its second habit prioritises the Right Flank for Physical damage — so a tactical dealer belongs Left and a physical one Right.",
              },
              {
                head: "Match troop type, and check the triangle",
                body: "Share an affinity across the line where you can, and look at what the enemy is marching before you commit.",
              },
            ].map((step, i) => (
              <li key={step.head} className="flex gap-3 px-3 py-2.5">
                <span className="font-heading mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[13px] text-amber-100 ring-1 ring-amber-400/30">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{step.head}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/pit"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            Record your pit
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/team"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            Build a line
          </Link>
          <Link
            href="/coach"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            Ask Copilot
          </Link>
        </div>
      </Section>

      <Section
        id="limits"
        title="What this site does not know"
        lede="So you can tell the difference between a fact and an opinion while reading the rest of it."
      >
        <ul className="max-w-3xl space-y-2 text-[15px] leading-relaxed">
          {[
            <>
              <strong>Hub power is not Army Power.</strong> The power number
              here comes from star rank and reign level only. Heirlooms,
              stronghold upgrades and riders are left out — we are not going to
              reverse-engineer those.
            </>,
            <>
              <strong>Stat and troop tables stop at level {LEVEL_CAP}.</strong>{" "}
              Reign levels above that are recordable but the numbers stop
              moving.
            </>,
            <>
              <strong>Habit upgrade ranks are not in the power number.</strong>{" "}
              Ranks change the percentages inside a habit&rsquo;s text; the
              catalog has no power figures for them.
            </>,
            <>
              <strong>
                Ability magnitudes are listed, not simulated.
              </strong>{" "}
              We show which stat enhances an effect and what percentage the
              catalog lists. We do not model a fight.
            </>,
            <>
              <strong>Meta cores are community opinion.</strong> The lines this
              site calls meta are what strong players were running in September
              2026, not a solved answer.
            </>,
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Catalog data is sourced from{" "}
          <a
            href={GUIDE_SOURCE}
            className="text-amber-200 underline-offset-2 hover:underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            Dragonfire-Hub
          </a>
          . This is an unofficial fan tool.
        </p>
      </Section>
    </div>
  );
}
