|            | FACTSCORE: |                  |           | Fine-grained |           | Atomic |            | Evaluation |     | of          |     |     |     |
| ---------- | ---------- | ---------------- | --------- | ------------ | --------- | ------ | ---------- | ---------- | --- | ----------- | --- | --- | --- |
|            | Factual    |                  | Precision | in           | Long      | Form   | Text       | Generation |     |             |     |     |     |
| SewonMin†1 |            | KalpeshKrishna†2 |           |              | XinxiLyu1 |        | MikeLewis4 |            |     | Wen-tauYih4 |     |     |     |
PangWeiKoh1 MohitIyyer2 LukeZettlemoyer1,4 HannanehHajishirzi1,3
|     | 1UniversityofWashington |     |     |                      | 2UniversityofMassachusettsAmherst |     |         |     |     |     |     |     |     |
| --- | ----------------------- | --- | --- | -------------------- | --------------------------------- | --- | ------- | --- | --- | --- | --- | --- | --- |
|     |                         |     |     | 3AllenInstituteforAI |                                   |     | 4MetaAI |     |     |     |     |     |     |
{sewon,alrope,pangwei,lsz,hannaneh}@cs.washington.edu
| {kalpesh,miyyer}@cs.umass.edu |     |     |     |     |     | {mikelewis,scottyih}@meta.com |     |     |     |     |     |     |     |
| ----------------------------- | --- | --- | --- | --- | --- | ----------------------------- | --- | --- | --- | --- | --- | --- | --- |
Abstract
Chat
Bridget Moynahan is an American actress, model and producer. She is best
Evaluatingthefactualityoflong-formtextgen- GPT known for  h e r  r o l e s   in  G r ey ’s   A n a t o m y ,  I,  R o b o t  a n d  B lu e  B l o o d s . S he studied
|     |     |     |     |     |     |     |     | a c ti | n g   a t  t h e  A m | e r i ca n   A c a d e m y |   o f  D ra m a t ic  A r | t s , a n d  … |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ------ | --------------------- | -------------------------- | ------------------------- | -------------- | --- |
eratedbylargelanguagemodels(LMs)isnon-
-Bridget Moynahan is American.
3202 tcO 11  ]LC.sc[  2v15241.5032:viXra trivialbecause(1)generationsoftencontaina -Bridget Moynahan is an actress.
|               |         |               |           |                     |     |         | -             |                           |                           |                                            |     | 66.7% |     |
| ------------- | ------- | ------------- | --------- | ------------------- | --- | ------- | ------------- | ------------------------- | ------------------------- | ------------------------------------------ | --- | ----- | --- |
| m ix tu re of | s u p p | o rt e d a nd | u n s u p | p o r te d p i e ce | s   | T e l l |   m e   - B   | r i d g e t   M o y n     | a h a n   i s   a   m o   | d e l .                                    |     |       |     |
|               |         |               |           |                     |     | a   b i | o   o f   - B | r i d g e t   M o y n     | a h a n   i s   a   p r o | d u c e r .                                |     |       |     |
|               |         |               |           |                     |     | B r i d | g e t   - S   | h e   i s   b e s t   k n | o w n   f o r   h e r     |   r o l e s   i n   G re y ’s  A n atomy.  |     |       |     |
of in fo rm at i o n , m a k in g bi n a r y j u d g m e n t s o f S h e   i s   b e s t   k n o w n   f o r   h e r   r o l e s   i n   I, R o b o t.
|                                         |     |     |     |     |     | Moynahan. | -She is best known for her roles in Blue Bloods.  |                         |                                                |     |     |     |     |
| --------------------------------------- | --- | --- | --- | --- | --- | --------- | ------------------------------------------------- | ----------------------- | ---------------------------------------------- | --- | --- | --- | --- |
| qualityinadequate,and(2)humanevaluation |     |     |     |     |     |           | - S                                               | h e   s t u d i e d   a | c t i n g .                                    |     |     |     |     |
|                                         |     |     |     |     |     |           | - S                                               | h e   s t u d i e d   a | t  t h e  A merican Academy of Dramatic Arts.  |     |     |     |     |
-…
| istime-consumingandcostly. |     |     | Inthispaper,we |     |     |     |       |                   |                     |                                 |                          |                       |                  |
| -------------------------- | --- | --- | -------------- | --- | --- | --- | ----- | ----------------- | ------------------- | ------------------------------- | ------------------------ | --------------------- | ---------------- |
|                            |     |     |                |     |     |     | Br id | g e t  M o yn a h | a n   is   a n  A m | e r ic a n   fil m m a k e r  a | n d  w r it e r .  S h e |  is   b e s t k n o w | n   fo r  h e r  |
introduceFACTSCORE,anewevaluationthat Stable w o r k  o n  th e  s o a p   o p e r a  G e n e ra l  H o s pi ta l ,  w h ic h  s h e   c o - c re a t e d  w it h  h u s b a n d
|     |     |     |     |     |     | LM  | Charles Kelly. Moynahan was raised in a middle-class family in Los Angeles, … |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ----------------------------------------------------------------------------- | --- | --- | --- | --- | --- | --- |
breaksagenerationintoaseriesofatomicfacts
-Bridget Moynahan is American.
-Bridget Moynahan is a filmmaker.
| and computes | the | percentage | of  | atomic facts |     |     |     |     |     |     |     |     |     |
| ------------ | --- | ---------- | --- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
-Bridget Moynahan is a writer.
supportedbyareliableknowledgesource. We -She is best known for her work on General Hospital.  10.0%
-General Hospital is the soap opera.
|                                        |     |     |     |     |     |     | - S | h e   c o - c r e a t | e d   G e n e r a l   H | o s p i t a l .                    |     |     |     |
| -------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --------------------- | ----------------------- | ---------------------------------- | --- | --- | --- |
| conductanextensivehumanevaluationtoob- |     |     |     |     |     |     | -   |                       |                         |                                    |     |     |     |
|                                        |     |     |     |     |     |     | - S | h e   c o - c r e a t | e d   G e n e r a l   H | o s p i t a l   with her husband.  |     |     |     |
| tainFACTSCOREsofpeoplebiographiesgen-  |     |     |     |     |     |     | - H | e r  h u s b a n d    |  is   C h a r le s  K e | lly.                               |     |     |     |
|                                        |     |     |     |     |     |     | - M | o y n a h a n  w      | a s   ra is e d  i n  a |  m i ddle-class family.            |     |     |     |
erated by several state-of-the-art commercial M oynahan was raised in Los Angeles.
|     |     |     |     |     |     |     | - … |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
LMs—InstructGPT,ChatGPT,andtheretrieval-
|     |     |     |     |     |     | Figure1: | Anoverviewof |     |     | FACTSCORE, |     | afractionof |     |
| --- | --- | --- | --- | --- | --- | -------- | ------------ | --- | --- | ---------- | --- | ----------- | --- |
augmentedPerplexityAI—andreportnewanal-
|                    |        |          |      |              |     | atomic                | facts | (pieces | of  | information)         | supported |     | by a |
| ------------------ | ------ | -------- | ---- | ------------ | --- | --------------------- | ----- | ------- | --- | -------------------- | --------- | --- | ---- |
| ysis demonstrating |        | the need | for  | such a fine- |     |                       |       |         |     |                      |           |     |      |
|                    |        |          |      |              |     | givenknowledgesource. |       |         |     | FACTSCOREallowsamore |           |     |      |
| grained score      | (e.g., | ChatGPT  | only | achieves     |     |                       |       |         |     |                      |           |     |      |
fine-grainedevaluationoffactualprecision,e.g.,inthe
| 58%). Since    | human | evaluation   |       | is costly, we |     |         |     |           |      |         |          |     |     |
| -------------- | ----- | ------------ | ----- | ------------- | --- | ------- | --- | --------- | ---- | ------- | -------- | --- | --- |
|                |       |              |       |               |     | figure, | the | top model | gets | a score | of 66.7% | and | the |
| also introduce |       | an automated | model | that esti-    |     |         |     |           |      |         |          |     |     |
bottommodelgets10.0%,whereaspriorworkwould
matesFACTSCOREusingretrievalandastrong
|     |     |     |     |     |     | assign | 0.0 to | both. | FACTSCORE |     | can either | be  | based |
| --- | --- | --- | --- | --- | --- | ------ | ------ | ----- | --------- | --- | ---------- | --- | ----- |
languagemodel,withlessthana2%errorrate.
|     |     |     |     |     |     | on human | evaluation, |     | or  | be automated, | which | allows |     |
| --- | --- | --- | --- | --- | --- | -------- | ----------- | --- | --- | ------------- | ----- | ------ | --- |
Finally,weusethisautomatedmetrictoeval-
evaluationofalargesetofLMswithnohumanefforts.
| uate 6,500 | generations | from | a new | set of 13 |     |     |     |     |     |     |     |     |     |
| ---------- | ----------- | ---- | ----- | --------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
recentLMsthatwouldhavecost$26Kifevalu-
| atedbyhumans,withvariousfindings: |     |     |     | GPT-4 |     |     |     |     |     |     |     |     |     |
| --------------------------------- | --- | --- | --- | ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
mationthatareamixtureoftrueorfalse,2makinga
andChatGPTaremorefactualthanpublicmod-
binaryjudgmentinadequate(Pagnonietal.,2021).
els,andVicunaandAlpacaaresomeofthebest
|                 |     |           |             |               |     | Second,                                      | validating |        | every | piece     | of information |     | is  |
| --------------- | --- | --------- | ----------- | ------------- | --- | -------------------------------------------- | ---------- | ------ | ----- | --------- | -------------- | --- | --- |
| public models.  |     | FACTSCORE | is          | available for |     |                                              |            |        |       |           |                |     |     |
|                 |     |           | factscore.1 |               |     | time-consumingandcostly.                     |            |        |       |           |                |     |     |
| publicuseviapip |     | install   |             |               |     |                                              |            |        |       |           |                |     |     |
|                 |     |           |             |               |     | In                                           | this       | paper, | we    | introduce | FACTSCORE      |     |     |
| 1 Introduction  |     |           |             |               |     | (FactualprecisioninAtomicityScore),aneweval- |            |        |       |           |                |     |     |
uationofanLMthatrepresentsthepercentageof
Long-formtextgeneratedbylargelanguagemod- atomicfacts(piecesofinformation)supportedbya
els(LMs)haswidelybeenused(Brownetal.,2020;
|     |     |     |     |     |     | givenknowledgesource. |     |     |     | Computing | FACTSCORE |     |     |
| --- | --- | --- | --- | --- | --- | --------------------- | --- | --- | --- | --------- | --------- | --- | --- |
Ouyangetal.,2022);nonetheless,evaluatingtheir involves(1)breakingagenerationintoaseriesof
factualprecision—whethereachpieceofinforma- atomic facts—short statements that each contain
tionconveyedinagenerationisfactuallyaccurate—
onepieceofinformation(NenkovaandPassonneau,
remainschallengingfortworeasons. First,agener- 2004;Shapiraetal.,2019;ZhangandBansal,2021;
ationconsistsofalargenumberofpiecesofinfor- Liuetal.,2022),and(2)assigningabinarylabel
†Corecontributors.
|     |     |     |     |     |     | 2Even | a   | single | sentence | consists | of multiple | pieces | of  |
| --- | --- | --- | --- | --- | --- | ----- | --- | ------ | -------- | -------- | ----------- | ------ | --- |
1Source code and guidelines are available at https:// information(e.g.,4.4persentenceinChatGPT,40%ofwhich
github.com/shmsw25/FActScore. areamixtureofsupportedandunsupportedinformation).

toeachatomicfact,allowingafine-grainedevalua- toextend FACTSCOREforabroadersetofgen-
tionoffactualprecision. WeevaluateFACTSCORE erations (e.g., open-ended generation) and to
on the task of generating people biographies be- furtherimprovetheestimator.
causegenerationsconsistofverifiablestatements
| rather than | debatable |     | or subjective |     | ones, | and the |     |     |     |     |     |     |
| ----------- | --------- | --- | ------------- | --- | ----- | ------- | --- | --- | --- | --- | --- | --- |
2 RelatedWork
scopeisbroad(i.e.,coveringdiversenationalities,
professions,andlevelsofrarity). Factual precision in text generation. Factual
precisionintextgenerationhasbeenanactivearea
Weperformextensivehumanannotationstoob-
tain FACTSCOREs of three state-of-the-art, com- of research in NLP. Most prior work studies fac-
mercially available LMs: InstructGPT (Ouyang tualprecisionofmodelssupervisedforaspecific
etal.,2022),ChatGPT(OpenAI,2022),andsearch- problem such as dialogue (Shuster et al., 2021),
augmentedPerplexityAI.3 or focuses on question answering with short an-
Ourresultsindicatethat
commercially available LMs are riddled with er- swers(Kadavathetal.,2022;Kandpaletal.,2022;
rors,havingFACTSCOREsof42%,58%and71%, Mallenetal.,2023;Norietal.,2023).
respectively. Their FACTSCOREs significantly Morerecentworkhasstudiedfactualprecision
drop as the rarity of the entities increases, e.g., oftextgenerationbeyondshortanswers. Leeetal.
80% → 16%forChatGPT. (2022) evaluates the factual precision with proxy
Since human evaluation is costly, we next in- metrics, e.g., whether named entities in a gener-
troduce an automatic evaluation of FACTSCORE ation appear in an article of the topic. A series
throughamodelthatestimatesa FACTSCORE for ofconcurrentworkverifiestheprecisionoftheci-
a given LM. Our estimator decomposes genera- tations(attributions)providedbythemodel(Gao
tions into atomic facts and validates each based et al., 2022; Liu et al., 2023a; Yue et al., 2023;
|     |     |     |     |     |     |     | Gaoetal.,2023). |     | AconcurrentworkbyManakul |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --------------- | --- | ------------------------ | --- | --- | --- |
onagivenknowledgesource,leveragingretrieval
from the given knowledge source and strong lan- et al. (2023) automates the identification of fac-
guagemodels. Ourestimatorcloselyapproximates tual errors in LM generations without using any
knowledgesource;weusetheirmethodasabase-
| FACTSCORE |     | withanerrorrateof< |     |     | 2%andcan |     |     |     |     |     |     |     |
| --------- | --- | ------------------ | --- | --- | -------- | --- | --- | --- | --- | --- | --- | --- |
beappliedtoarangeofnewLMsatscalewithno lineestimatorinSection4. Incontrast, ourwork
humaneffort. Ourcasestudyevaluates6,500gen- (1) considers much longer text generation4 from
erationsfrom13LMsthatcouldhavecost$26K, avarietyofstate-of-the-artLMswithandwithout
withvariousfindings: GPT-4(OpenAI,2023)and search, (2) provides their fine-grained evaluation
ChatGPTarefarlessfactualthanhumansbutare bothbyhumanexpertsandthroughanautomated
muchbetterthanpublicmodels,andthereisalarge evaluatorthatcloselyapproacheshumans,and(3)
appliesittoalargesetofLMsatscale.
variancebetweenpublicmodels,withVicuna(Chi-
| ang et al., | 2023) | and | Alpaca | (Taori | et  | al., 2023) |                   |     |                           |     |     |     |
| ----------- | ----- | --- | ------ | ------ | --- | ---------- | ----------------- | --- | ------------------------- | --- | --- | --- |
|             |       |     |        |        |     |            | FactVerification. |     | Ourworkiscloselyrelatedto |     |     |     |
beingsomeofthebest.
priorworkonfactverification(Thorneetal.,2018;
Insummary,ourcontributionsareasfollows.
|     |     |     |     |     |     |     | Wadden | et al., 2020) | where | claim | sentences | are |
| --- | --- | --- | --- | --- | --- | --- | ------ | ------------- | ----- | ----- | --------- | --- |
1. WeintroduceFACTSCORE,anewevaluationof automaticallycheckedagainstalargeknowledge
factualprecisionofLMsbybreakingtheirgen- sourcelikeWikipediaorscientificliterature. Most
erations into atomic facts and validating each literature assumes a single, atomic claim, some-
againstagivenknowledgesource. Humaneval- times modeled with surrounding context (Nakov
uationrevealsthatthestate-of-the-artLMswith et al., 2018; Mihaylova et al., 2019; Shaar et al.,
andwithoutsearchhavelow FACTSCOREs. 2022). There also has been work that verifies a
longersentenceortextthroughdecompositionto
| 2. We | introduce | a   | model | that | approximates |     |     |     |     |     |     |     |
| ----- | --------- | --- | ----- | ---- | ------------ | --- | --- | --- | --- | --- | --- | --- |
atomicfacts(Fanetal.,2020;Wrightetal.,2022;
| FACTSCORE |     | with | an error | rate | of  | < 2%, al- |     |     |     |     |     |     |
| --------- | --- | ---- | -------- | ---- | --- | --------- | --- | --- | --- | --- | --- | --- |
Chenetal.,2022;Kamoietal.,2023)fromwhich
| lowing | evaluation |     | of a large | set | of  | new LMs |         |              |     |         |            |     |
| ------ | ---------- | --- | ---------- | --- | --- | ------- | ------- | ------------ | --- | ------- | ---------- | --- |
|        |            |     |            |     |     |         | we take | inspiration. | The | primary | difference | be- |
withoutmanualhumanefforts.
|       |              |     |           |     |     |           | tween fact | verification | literature |     | and our | work is |
| ----- | ------------ | --- | --------- | --- | --- | --------- | ---------- | ------------ | ---------- | --- | ------- | ------- |
| 3. We | open-sourced |     | FACTSCORE |     | and | the anno- |            |              |            |     |         |         |
thatwefocusonlong-formmodel-generatedtext
| tated | data | for public | use, | available |     | via pip |     |     |     |     |     |     |
| ----- | ---- | ---------- | ---- | --------- | --- | ------- | --- | --- | --- | --- | --- | --- |
ratherthansentence-levelhuman-writtenclaims.
| install        |     | factscore. | Wesuggestfuturework |     |     |     |                                              |            |       |        |                 |     |
| -------------- | --- | ---------- | ------------------- | --- | --- | --- | -------------------------------------------- | ---------- | ----- | ------ | --------------- | --- |
|                |     |            |                     |     |     |     | 4Consisting                                  | of 110–151 | words | (Table | 1), in contrast | to  |
| 3perplexity.ai |     |            |                     |     |     |     | 18–29inGaoetal.(2022)and65inLiuetal.(2023a). |            |       |        |                 |     |

Model-basedEvaluation. Priorworkhasused ingthefirstgenerationhigherthanthesecond.
| learned                                 | models | to define | automated | evaluation |      |                       |                                |     |                       |     |     |
| --------------------------------------- | ------ | --------- | --------- | ---------- | ---- | --------------------- | ------------------------------ | --- | --------------------- | --- | --- |
|                                         |        |           |           |            |      | KeyIdea2:             | Factualprecisionasafunctionofa |     |                       |     |     |
| scores(Zhangetal.,2020;Liuetal.,2023b). |        |           |           |            | This |                       |                                |     |                       |     |     |
|                                         |        |           |           |            |      | givenknowledgesource. |                                |     | Priorworkoftenconsid- |     |     |
includesmodel-basedevaluationinsummarization ersfactualprecisionasasingleglobaltruth(Man-
thatconsiderstheconsistencybetweenasummary
|     |     |     |     |     |     | akul et | al., 2023). | In contrast, |     | we adopt | a per- |
| --- | --- | --- | --- | --- | --- | ------- | ----------- | ------------ | --- | -------- | ------ |
andasourcedocumentusingQAorNLI(Kryscin-
spectivethatthetruthfulnessofastatementshould
| ski et al., | 2020; | Wang et | al., 2020; | Fabbri | et al., |     |     |     |     |     |     |
| ----------- | ----- | ------- | ---------- | ------ | ------- | --- | --- | --- | --- | --- | --- |
dependonaparticularknowledgesourcethatend
2022;Deutschetal.,2021;Labanetal.,2022). We usersconsidertobetrustworthyandreliable. There-
| takeinspirationfromthiswork, |     |     | andevaluatefac- |     |     |     |     |     |     |     |     |
| ---------------------------- | --- | --- | --------------- | --- | --- | --- | --- | --- | --- | --- | --- |
fore,insteadofwhetheranatomicfactisglobally
| tual precision | of  | LM generations |     | by considering |     |     |     |     |     |     |     |
| -------------- | --- | -------------- | --- | -------------- | --- | --- | --- | --- | --- | --- | --- |
trueorfalse,weconsiderwhetheritissupportedby
whetherpiecesofinformationaresupportedbya agivensourceofknowledge. Thishasbeenusedin
largetextcorpus.
thefactverificationliterature(Waddenetal.,2022)
|              |     |                   |     |     |     | where conflict | of information |     | between | different |     |
| ------------ | --- | ----------------- | --- | --- | --- | -------------- | -------------- | --- | ------- | --------- | --- |
| 3 FACTSCORE: |     | EvaluatingFactual |     |     |     |                |                |     |         |           |     |
sourcesisrelativelycommon.
PrecisionofLong-formTextGeneration
|     |     |     |     |     |     | Definition. | LetMbealanguagemodeltobeeval- |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ----------- | ----------------------------- | --- | --- | --- | --- |
Weintroduce FACTSCORE,anewevaluationofan uated,X beasetofprompts,andC beaknowledge
LMthatconsidersthefactualprecisionofatomic source. Consider a response y = M for x ∈ X
x
facts generated by the LM. We perform human andA ,alistofatomicfactsiny. AFACTSCORE
y
evaluationstocalculateFACTSCOREsofthestate- ofMisdefinedasfollows.
| of-the-art | LMs (Section | 3.3) | and | discuss | results |     |     |     |     |     |     |
| ---------- | ------------ | ---- | --- | ------- | ------- | --- | --- | --- | --- | --- | --- |
1 (cid:88)
(Section 3.4). FACTSCORE allows rigorous and f(y) = I[aissupportedbyC],
|A y |
| fine-grainedevaluationoffactualprecision,butis |     |     |     |     |     |     | a∈Ay |     |     |     |     |
| ---------------------------------------------- | --- | --- | --- | --- | --- | --- | ---- | --- | --- | --- | --- |
time-consumingandcostly,motivatingautomatic FACTSCORE(M) = E [f(M )|M responds].
|     |     |     |     |     |     |     |     | x∈X |     | x x |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
evaluationinSection4.
|     |     |     |     |     |     | M responds | means | M   | did not | abstain from | re- |
| --- | --- | --- | --- | --- | --- | ---------- | ----- | --- | ------- | ------------ | --- |
x
| 3.1 Definition |     |     |     |     |     | spondingtothepromptx. |     |     |     |     |     |
| -------------- | --- | --- | --- | --- | --- | --------------------- | --- | --- | --- | --- | --- |
Thisdefinitionassumes
thefollowing:
FACTSCOREisbasedontwokeyideas.
Key idea 1: Atomic fact as a unit. Long-form 1. Whetherornotanatomicfactissupportedby
| textconsistsofmanypiecesofinformationthatcan |     |     |     |     |     | C isundebatable. |     |     |     |     |     |
| -------------------------------------------- | --- | --- | --- | --- | --- | ---------------- | --- | --- | --- | --- | --- |
eachbeeithertrueorfalse. Priorworkhasexplored 2. EveryatomicfactinA hasanequalweightof
y
usingasentenceasaunit;however,evenasingle
importance,followingKrishnaetal.(2023).
| sentence | is a mix | of supported | and | unsupported |     |           |                |     |         |              |     |
| -------- | -------- | ------------ | --- | ----------- | --- | --------- | -------------- | --- | ------- | ------------ | --- |
|          |          |              |     |             |     | 3. Pieces | of information |     | in C do | not conflict | or  |
facts,e.g.,in40%ofthecaseswithChatGPT.Pre-
overlapwitheachother.
| vious and | concurrent | work | either | (1) defines | an  |     |     |     |     |     |     |
| --------- | ---------- | ---- | ------ | ----------- | --- | --- | --- | --- | --- | --- | --- |
additional label of partial support (Manakul Intherestofthepaper,weproposetousepeople
et al., 2023; Liu et al., 2023a) whose definition biographiesasX andWikipediaasC becausethey
maybesubjectiveandcanleadtolowagreement,
|     |     |     |     |     |     | satisfy these | assumptions |     | to a reasonable |     | degree |
| --- | --- | --- | --- | --- | --- | ------------- | ----------- | --- | --------------- | --- | ------ |
or (2) takes the strictest definition of support (Section 3.3). We discuss in which cases these
thatrequireseverypieceofinformationtobesup- assumptionsholdormaynotholdinmoredetailin
ported (Rashkin et al., 2021; Gao et al., 2022), theLimitationsection.
which ignores the partial support cases, e.g., as- FACTSCOREconsidersprecisionbutnotrecall,
signing 0.0 to both generations in Figure 1 even e.g.,amodelthatabstainsfromansweringtoooften
though the first generation is considerably more orgeneratestextwithfewerfactsmayhaveahigher
accuratethanthesecond.
|     |     |     |     |     |     | FACTSCORE, | even | if these | are | not desired. | We  |
| --- | --- | --- | --- | --- | --- | ---------- | ---- | -------- | --- | ------------ | --- |
Inthispaper,wedefineanatomicfactasashort leavetheevaluationoffactualrecallforfuturework
sentenceconveyingonepieceofinformation(ex- (morediscussionintheLimitationsection).
amplesinFigure1),similartosummarizationcon-
| tent units | (Nenkova | and Passonneau, |     | 2004). | An  | 3.2 StudiedLMs |     |     |     |     |     |
| ---------- | -------- | --------------- | --- | ------ | --- | -------------- | --- | --- | --- | --- | --- |
atomicfactisamorefundamentalunitthanasen- We evaluate three LMs (referred to as LM ,
SUBJ
tence for a piece of information and provides a an LM as a subject): (1) InstructGPT
morefine-grainedevaluation,e.g.,inFigure1,rat- (text-davinci-003, updated from Ouyang et al.

(2022)), (2) ChatGPT (OpenAI, 2022), and (3) InstGPT ChatGPT PPLAI
| PerplexityAI,3      |     | whichincorporatesasearchengine |     |     |     |                     |     |       |      |       |       |
| ------------------- | --- | ------------------------------ | --- | --- | --- | ------------------- | --- | ----- | ---- | ----- | ----- |
|                     |     |                                |     |     |     | Usesearch           |     |       | ✗    | ✗     | ✓     |
| withalanguagemodel. |     |                                |     |     |     | %responding         |     |       | 99.5 | 85.8  | 90.7  |
|                     |     |                                |     |     |     | #tokens/response    |     | 110.6 |      | 154.5 | 151.0 |
|                     |     |                                |     |     |     | #sentences/response |     |       | 6.2  | 7.9   | 9.8   |
3.3 Data
|     |     |     |     |     |     | #facts/response |     |     | 26.3 | 34.7 | 40.8 |
| --- | --- | --- | --- | --- | --- | --------------- | --- | --- | ---- | ---- | ---- |
Weperformhumanevaluationoffactualprecision
Statisticsofthelabels
based on our definition. We prompt the LM Supported 42.3 50.0 64.9
SUBJ
|     |     |     |     |     |     | Not-supported |     |     | 43.2 | 27.5 | 11.1 |
| --- | --- | --- | --- | --- | --- | ------------- | --- | --- | ---- | ---- | ---- |
togeneratepeoplebiographiesandevaluatethem
|     |     |     |     |     |     | Irrelevant |     |     | 14.0 | 8.3 | 14.8 |
| --- | --- | --- | --- | --- | --- | ---------- | --- | --- | ---- | --- | ---- |
againstWikipediaforthefollowingreasons.
|     |     |     |     |     |     | Abstainsfromanswering |     |     | 0.5  | 14.2 | 9.3  |
| --- | --- | --- | --- | --- | --- | --------------------- | --- | --- | ---- | ---- | ---- |
|     |     |     |     |     |     | FACTSCORE             |     |     | 42.5 | 58.3 | 71.5 |
• Biographiesareobjective(notsubjectiveorde-
batable)andcontainspecific(notvague)infor-
Table1: StatisticsofthedataandFACTSCOREresults.
mation,satisfyingAssumption1inSection3.1.
InstGPTandPPLAIrespectivelyrefertoInstructGPT
• Biographiesallowevaluationacrossdiversena-
andPerplexityAI.%respondingindicates%ofgener-
tionalities,professions,andlevelsofrarities. ationsthatdonotabstainfromresponding. #tokensis
| • Wikipediaoffersreasonablecoverageofinfor- |       |        |     |               |       | basedonwhitespace. |     |     |     |     |     |
| ------------------------------------------- | ----- | ------ | --- | ------------- | ----- | ------------------ | --- | --- | --- | --- | --- |
| mation                                      | about | people | and | is reasonably | self- |                    |     |     |     |     |     |
consistent,5
satisfyingAssumption3. ofthedataandcalculatetheagreementrate: 96%,
90%and88%forInstructGPT,ChatGPTandPer-
| Data collection. |     | We        | carefully | design    | an anno- |                         |     |                        |     |     |     |
| ---------------- | --- | --------- | --------- | --------- | -------- | ----------------------- | --- | ---------------------- | --- | --- | --- |
|                  |     |           |           |           |          | plexityAI,respectively. |     | Moredetailsareprovided |     |     |     |
| tation pipeline  |     | to assign | a factual | precision | to a     |                         |     |                        |     |     |     |
inAppendixA.3.
long-formgenerationthroughthefollowingsteps.
| Step 0:    | Sampling  | people | entities. |           | We sample | 3.4 Results |             |     |         |              |     |
| ---------- | --------- | ------ | --------- | --------- | --------- | ----------- | ----------- | --- | ------- | ------------ | --- |
| 183 people | entities  | from   | Wikidata  | who       | have cor- |             |             |     |         |              |     |
|            |           |        |           |           |           | Statistics  | of the data | and | results | are reported | in  |
| responding | Wikipedia |        | pages.    | We sample | entities  |             |             |     |         |              |     |
Table1.
toannotatefromauniformdistributionovercate-
goriesdefinedinAppendixA.1. All LM s struggle with factual preci-
SUBJ
|                           |                       |        |           |                  |        | sionerrors.                                | InstructGPTandChatGPTachieve |     |        |               |     |
| ------------------------- | --------------------- | ------ | --------- | ---------------- | ------ | ------------------------------------------ | ---------------------------- | --- | ------ | ------------- | --- |
| Step1:                    | Obtaininggenerations. |        |           | Wefeedaprompt    |        |                                            |                              |     |        |               |     |
|                           |                       |        |           |                  |        | FACTSCOREs                                 | of 42.5%                     | and | 58.3%, | respectively. |     |
| “Tell                     | me a                  | bio of | <entity>” | to               | the LM |                                            |                              |     |        |               |     |
|                           |                       |        |           |                  | SUBJ   | PerplexityAI,whichusesacommercialsearchen- |                              |     |        |               |     |
| andtakeagenerationasitis. |                       |        |           | Weimplementrules |        |                                            |                              |     |        |               |     |
gineandthusshouldhaveaperfectFACTSCOREif
toidentifygenerationsthatabstainfromanswering
directlycopyingthetextfromthecorrectWikipedia
andfilterthemout.
|        |                        |     |     |              |     | page,attainsaFACTSCOREof71.5%. |          |        |             | Weprovide |          |
| ------ | ---------------------- | --- | --- | ------------ | --- | ------------------------------ | -------- | ------ | ----------- | --------- | -------- |
| Step2: | Atomicfactsgeneration. |     |     | Humanannota- |     |                                |          |        |             |           |          |
|        |                        |     |     |              |     | a qualitative                  | analysis | of its | error cases | in        | the last |
torsbreakagenerationintoaseriesofatomicfacts. paragraphofthissection.
Tosaveannotationtime,weprovideatomicfacts ChatGPT and PerplexityAI often abstain from
brokendownbyInstructGPTwhichhumanannota- answering which presumably improves their fac-
| torscantakeandrevise. |     |     | DetailsinAppendixA.2. |     |     |                 |             |     |        |          |      |
| --------------------- | --- | --- | --------------------- | --- | --- | --------------- | ----------- | --- | ------ | -------- | ---- |
|                       |     |     |                       |     |     | tual precision. | InstructGPT |     | rarely | abstains | from |
answering,likelybecauseitisnottrainedtodoso.
| Step3: | Labelingfactualprecision&editing. |     |     |     | We  |     |     |     |     |     |     |
| ------ | --------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Irrelevantfactseither(a)havedependencieson
askanothersetofhumanannotatorstoassigneach
atomicfactoneofthreelabels. Iftheatomicfactis previousfactsinagenerationthatturnouttobeun-
clearlynotrelatedtotheprompt,andthusshould supported,or(b)areirrelevanttothepromptinde-
pendentfromotherfactsinageneration(examples
beremovedfromthebiowithoutavalidationstep,
theyassignIrrelevant. Ifthefactisrelevant,they inAppendixA.4). Wefindthat(b)rarelyhappens
validate the fact based on the English Wikipedia, withInstructGPTandChatGPTbuthappenscon-
siderablywithPerplexityAI,becausePerplexityAI
andlabeleitherSupportedorNot-supported.
oftendirectlycopiessearchresultseveniftheyare
WerecruitfreelancersthroughUpworkandpay
|       |         |       |            |          |        | largely irrelevant | to  | the input | prompt. |     | This is in |
| ----- | ------- | ----- | ---------- | -------- | ------ | ------------------ | --- | --------- | ------- | --- | ---------- |
| 15–25 | USD per | hour. | Annotation | requires | exten- |                    |     |           |         |     |            |
agreementwithaconcurrentworkfromLiuetal.
| sive effort | and | time, | leading | to the cost | of $4 per |     |     |     |     |     |     |
| ----------- | --- | ----- | ------- | ----------- | --------- | --- | --- | --- | --- | --- | --- |
(2023a)thatshowsgenerativesearchengineslike
| generation. | Weassigntwofreelancersforthe10% |     |     |     |     |     |     |     |     |     |     |
| ----------- | ------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
PerplexityAIcopyincorrectsearchresultsandgen-
5SeeAppendixA.5forarelatedanalysis. eratetextthatisirrelevanttotheinputquery.

|     |     | Category | %   | Example |     |     |     |     |     |     |     |     |
| --- | --- | -------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
Single-sentencecon- 33.3 GenOnNovember25th,2023,GloverTeixeirabecameanAmericancitizen.WikiInNovember2020,Teixeira
|     |     | tradiction |     | becameanAmericancitizen. |     |     |     |     |     |     |     |     |
| --- | --- | ---------- | --- | ------------------------ | --- | --- | --- | --- | --- | --- | --- | --- |
(words) Gen[EricHacker]wasnamedtheInternationalLeaguePitcheroftheYear.Wiki[EricHacker]wasnamedtheIL
PitcheroftheWeek.
Single-sentencecon- 10.0 GenWilliamWaldegrave’sgrandfatherwasJamesIIandVII.WikiHisfather’stitlewascreated... forthe
tradiction diplomatandambassadorJamesWaldegrave,1stEarlWaldegrave,whosegrandfatherwasJamesIIandVII.
(beyondwords) GenShehasappearedinseveralsuccessfulfilmssuchas(...)andZero(2018).Wiki:Zerowasacommercial
failure.
Page-levelcontradic- 23.3 GenSomeof[JuliaFaye’s]notablefilmsinclude..."Cleopatra"(1934).CommentNomentionofCleopatraon
|     |     | tion |     | theJuliaFayepage,andnomentionofJuliaFayeontheCleopatrapage. |     |     |     |     |     |     |     |     |
| --- | --- | ---- | --- | ----------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
Gen[KangJi-hwan]hasdonatedmoneytovariouscharitiesandorganizationsovertheyears.CommentNosuch
mentionontheKangJi-hwanpage.
Subjective 16.7 GenHisachievements,asanactorandasaculturalforce,willsurelyprovetobeasheroicasthoseofthe
charactersheportrayed.WikiCulturewriterSteveRose,inTheGuardian,wrote:“ChadwickBosemanbeganhis
careerplayingAfricanAmericaniconsandpioneers;heendsitasonehimself.His[...]achievements,asanactor
andasaculturalforce,willsurelyprovetobeasheroicasthoseofthecharactersheportrayed.”
Factisirrelevant 3.3 Gen[ZamfirArbore]’slifeisnotwell-documented,andthereislittleinformationavailableabouthim.
Wikiisinconsistent 3.3 GenKick(2014)thatbrought[SajidNadiadwala]variousdebutantdirectorawards.Wiki2015,IIFAAwardfor
&wrong DebutDirector,Kick.(...)Kickbroughthimvariousdebutantdirectorawards.CommentThefirsttextisfroma
tablethatindicateshewononeaward(accurate).Thesecondisinaccurate,incorrectlycitinganewsarticle.
Annotationerror 10.0 Gen[ZamfirArbore]waspartofthestaffofRomânul.WikiTheRomânulstaffcametoincludeZamfirArbore.
CommentMentionedintheRomânulpagebutnotintheZamfirArborepage.
Table2: Categorizationofprecisionerrors(Not-supported)fromPerplexityAI(SectionA.5). Genindicatesthe
generationfromPerplexityAI,andWikiindicatesevidencetextfromWikipedia. Commentindicatesourcomments.
PerplexityAI
|     | InstructGPT |     | ChatGPT |     |     |     | andMallenetal.(2023)whoreportQAaccuracy |                |           |     |            |     |
| --- | ----------- | --- | ------- | --- | --- | --- | --------------------------------------- | -------------- | --------- | --- | ---------- | --- |
| 75  |             | 75  |         | 75  |     |     | of models                               | with retrieval | is robust | to  | the rarity | of  |
entities,FACTSCOREofPerplexityAIstillsignif-
| 50  |     | 50  |     | 50  |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
25 25 25 icantly drops as entities are rarer: a relative drop
| 0         |                       | 0         |                       | 0         |        |                | of50%and64%observedattheatomic-leveland |     |     |     |     |     |
| --------- | --------------------- | --------- | --------------------- | --------- | ------ | -------------- | --------------------------------------- | --- | --- | --- | --- | --- |
| Very freq | Freq m Rare Very rare | Very freq | Freq m Rare Very rare | Very freq | Freq m | Rare Very rare |                                         |     |     |     |     |     |
|           | Mediu                 |           | Mediu                 |           | Mediu  |                |                                         |     |     |     |     |     |
sentence-level,respectively.
|     | InstructGPT |     | ChatGPT |     | PerplexityAI |     |     |     |     |     |     |     |
| --- | ----------- | --- | ------- | --- | ------------ | --- | --- | --- | --- | --- | --- | --- |
Errorratesarehigherforfactsmentionedlater
| 75  |     | 75  |     | 75  |     |     |                  |     |                            |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------------- | --- | -------------------------- | --- | --- | --- |
|     |     |     |     |     |     |     | inthegeneration. |     | Figure2(bottom)reportsfac- |     |     |     |
| 50  |     | 50  |     | 50  |     |     |                  |     |                            |     |     |     |
tualprecisionoverrelativepositionsinageneration.
| 25  |     | 25  |     | 25  |     |     | AcrossallLMs,thelaterpartofthegenerationhas |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------------------------------- | --- | --- | --- | --- | --- |
0 -20 20-40 40-60 60-80 80- 0 -20 20-40 40-60 60-80 80- 0 -20 20-40 40-60 60-80 80- significantly worse precision. This is likely be-
|     |     |     |     |     |     |     | cause (a) | information | mentioned | earlier | is  | more |
| --- | --- | --- | --- | --- | --- | --- | --------- | ----------- | --------- | ------- | --- | ---- |
Figure2: FACTSCOREacrossvaryingfrequencylevels frequentlymentionedinthepretrainingdata(e.g.,
ofhumanentities(top)andrelativepositionsinagener-
nationality,profession),and(b)errorpropagation
|     |     | ation(bottom). | FACTSCOREsarelowerastherarityof |     |     |     |             |            |                    |     |      |      |
| --- | --- | -------------- | ------------------------------- | --- | --- | --- | ----------- | ---------- | ------------------ | --- | ---- | ---- |
|     |     |                |                                 |     |     |     | affects the | later part | of the generation. |     | This | also |
theentitiesincreasesandthepositionofthefactislater.
impliesthatevaluatingLMssolelybasedonshort
answersmaynotprovideanadequateassessment
oftheirfactualprecision,asitfailstoaccountfor
|     |     | Errorratesarehigherforrarerentities. |     |     |     | Fig- |     |     |     |     |     |     |
| --- | --- | ------------------------------------ | --- | --- | --- | ---- | --- | --- | --- | --- | --- | --- |
errorsthatariseinthelaterstagesofgeneration.
|     |     | ure 2 | (top) shows | factual precision | over | varying |                                     |     |     |     |       |     |
| --- | --- | ----- | ----------- | ----------------- | ---- | ------- | ----------------------------------- | --- | --- | --- | ----- | --- |
|     |     |       |             |                   |      |         | QualitativeanalysisofNot-supported. |     |     |     | Oneof |     |
frequencylevelsoftopicentities(humans)inthe
|     |     |                                           |                 |                        |      |            | the surprising      | findings  | in our                       | empricial | analysis |     |
| --- | --- | ----------------------------------------- | --------------- | ---------------------- | ---- | ---------- | ------------------- | --------- | ---------------------------- | --------- | -------- | --- |
|     |     | pretrainingcorpora(seeAppendixA.1).       |                 |                        |      | Thereis    |                     |           |                              |           |          |     |
|     |     |                                           |                 |                        |      |            | is that a FACTSCORE |           | of PerplexityAI              |           | (71.5%)  |     |
|     |     | anotabledecreasein                        |                 | FACTSCOREastherarityof |      |            |                     |           |                              |           |          |     |
|     |     |                                           |                 |                        |      |            | is lower than       | expected  | despite                      | having    | access   | to  |
|     |     | entitiesincreases,consistentlyacrossallLM |                 |                        |      | s.         |                     |           |                              |           |          |     |
|     |     |                                           |                 |                        |      | SUBJ       | thesearchengine.    |           | Tobetterunderstanditserrors, |           |          |     |
|     |     | This                                      | is in agreement | with Kandpal           | et   | al. (2022) |                     |           |                              |           |          |     |
|     |     |                                           |                 |                        |      |            | we categorize       | 30 random | samples                      | whose     | label    | is  |
|     |     | and                                       | Mallen et al.   | (2023) which           | show | that short |                     |           |                              |           |          |     |
Not-supported(Table2).
questionanswering(QA)accuracyishighlycorre-
latedwiththeentityfrequenciesinthepretraining • Single-sentence contradiction: A single sen-
data. However,incontrasttoKandpaletal.(2022) tencefromWikipediaprovidesdirectcontradic-

tion to the generation, either at a word level tion4.2). FACTSCORE estimatedbyourmodelis
(numbers,dates,orentities)orbeyond. thenusedtoevaluatetwelveLMs(Section4.3).
| • Page-level | contradiction: |     | Errors | found | after |     |     |     |     |     |     |     |
| ------------ | -------------- | --- | ------ | ----- | ----- | --- | --- | --- | --- | --- | --- | --- |
4.1 Model
| reading | the entire | page, | often | because | a fact |               |     |           |     |       |        |        |
| ------- | ---------- | ----- | ----- | ------- | ------ | ------------- | --- | --------- | --- | ----- | ------ | ------ |
|         |            |       |       |         |        | Our estimator | of  | FACTSCORE |     | first | breaks | a gen- |
thatshouldhavebeenmentionedinWikipediaif
erationintoaseriesofatomicfactsandthenvali-
trueismissing,e.g.,whetherthesubjectappears
|     |     |     |     |     |     | dateseachagainstthegivenknowledgesource. |     |     |     |     |     | We  |
| --- | --- | --- | --- | --- | --- | ---------------------------------------- | --- | --- | --- | --- | --- | --- |
inaparticularfilm.
findtakingatomicfactsgeneratedbyInstructGPT
| • Subjective: | Generation |     | is subjective, |     | often be- |          |                 |     |            |     |                |     |
| ------------- | ---------- | --- | -------------- | --- | --------- | -------- | --------------- | --- | ---------- | --- | -------------- | --- |
|               |            |     |                |     |           | (used in | data collection |     | in Section |     | 3.3) effective |     |
causePerplexityAIcopiessubjectivetextfrom
andclosetohuman,consistentwithfindingsfrom
Wikipedia,e.g.,directlycopyingaquotefroma
|     |     |     |     |     |     | priorwork(Chenetal.,2022). |     |     |     | Thissectionthus |     |     |
| --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- | --------------- | --- | --- |
journalistwithoutrealizingit.
focusesonhowtovalidateeachatomicfactagainst
| • Factisirrelevant: |     | Generationisirrelevanttothe |     |     |     |     |     |     |     |     |     |     |
| ------------------- | --- | --------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
agivenknowledgesource.
subjectduetoasearcherror.
Thevalidationisbasedonzero-shotprompting
• Wiki is inconsistent & wrong: In the example, ofanLMreferredtoasanLM todistinguish
EVAL
Wikipedia indicates that the subject won one from an LM . Specifically, a prompt—whose
SUBJ
awardfromthefilmKick,butalsoincludestext constructionmethodsdifferacrossfourvariants—
thattheywonmultipleawardsfromKick,which isfedintoanLM . Thepredictionisthenmade
EVAL
isinaccurateandcitedanewsarticlethatdoes bycomparingtheconditionalprobabilityofTrue
notsupporttheclaim. and False from the LM . If the logit values
EVAL
|              |        |            |     |        |           | are unavailable | (e.g., | commercial |     | LMs | like | Chat- |
| ------------ | ------ | ---------- | --- | ------ | --------- | --------------- | ------ | ---------- | --- | --- | ---- | ----- |
| • Annotation | error: | Annotators |     | assign | incorrect |                 |        |            |     |     |      |       |
labels, typically because the information is GPT),thepredictionismadebasedonwhetherthe
generatedtextcontainsTrueorFalse.6
notmentionedinthesubject’sWikipediapage
Thefourvariantsweconsiderareasfollows.
(likelybecauseitisinsignificant).
|     |     |     |     |     |     | No-context | LM  | uses <atomic-fact> |     |     | True | or  |
| --- | --- | --- | --- | --- | --- | ---------- | --- | ------------------ | --- | --- | ---- | --- |
Wealsofindthat,althoughPerplexityAIprovides False? asaprompt,closelyresemblingKadavath
| citationstothereferences,citationshavelittlecor- |     |     |               |     |     | etal.(2022).7 |     |     |     |     |     |     |
| ------------------------------------------------ | --- | --- | ------------- | --- | --- | ------------- | --- | --- | --- | --- | --- | --- |
| relationwithfactualprecision.                    |     |     | 36.0%and37.6% |     |     |               |     |     |     |     |     |     |
Retrieve→LMretrievespassagesfromthegiven
| of supported           | and | unsupported | sentences |             | have ci- |                                    |                                |     |     |     |      |      |
| ---------------------- | --- | ----------- | --------- | ----------- | -------- | ---------------------------------- | ------------------------------ | --- | --- | --- | ---- | ---- |
|                        |     |             |           |             |          | knowledgesourceandthenpromptstheLM |                                |     |     |     |      | . It |
| tations, respectively. |     | Together    | with      | independent |          |                                    |                                |     |     |     | EVAL |      |
|                        |     |             |           |             |          | firstretrievesk                    | passages,constructsthepromptby |     |     |     |      |      |
findingsfromLiuetal.(2023a),thisindicatesthat
concatenatingretrievedpassages,thegivenatomic
commercialLMsthatincorporatesearchandpro-
|     |     |     |     |     |     | fact, and | “True | or False?”, |     | and feeds | it  | to the |
| --- | --- | --- | --- | --- | --- | --------- | ----- | ----------- | --- | --------- | --- | ------ |
videcitationsmaynotbeasreliableasexpected.
LM togettheprediction.
EVAL
MoreanalysisisprovidedinAppendixA.5.
NonparametricProbability(NP)makesajudg-
|              |           |     |     |              |     | mentbasedonanonparametriclikelihood. |     |     |     |     | Itmasks |     |
| ------------ | --------- | --- | --- | ------------ | --- | ------------------------------------ | --- | --- | --- | --- | ------- | --- |
| 4 Estimating | FACTSCORE |     |     | forAutomatic |     |                                      |     |     |     |     |         |     |
outeachtokenintheatomicfact,computesitslike-
Evaluation
|     |     |     |     |     |     | lihood using | a nonparametric |     |     | masked | LM  | (Min |
| --- | --- | --- | --- | --- | --- | ------------ | --------------- | --- | --- | ------ | --- | ---- |
Humanevaluationoffactualprecisioniscostly($4 etal.,2023),averagesprobabilitiesoveralltokens,
pergeneration)(Bohnetetal.,2022;Krishnaetal., andmakesapredictionbasedonthresholding.
2023)becausevalidatingeveryatomicfactagainst Retrieve→LM + NP is an ensemble of
alargeknowledgesourceistime-consuming,and
Retrieve→LMandNPwhichassignsSupported
onegenerationcontainsmany(26–41)atomicfacts. onlyifbothmethodsassignSupported.
| This prevents | LM  | developers | and | practitioners |     |     |     |     |     |     |     |     |
| ------------- | --- | ---------- | --- | ------------- | --- | --- | --- | --- | --- | --- | --- | --- |
6InAppendixB.3,wecomparewithanalternativeprompt-
fromevaluatingthefactualprecisioninlong-form
ingthatgeneratesaquestionandcomparestheanswertoit
| generationofanewLM |     |      | atscale. | Inthiscontext, |     |                                                      |     |     |     |     |     |     |
| ------------------ | --- | ---- | -------- | -------------- | --- | ---------------------------------------------------- | --- | --- | --- | --- | --- | --- |
|                    |     | SUBJ |          |                |     | andtheexpectedanswer(Kryscinskietal.,2020;Wangetal., |     |     |     |     |     |     |
weintroduceamodelthatestimates FACTSCORE. 2020;Gaoetal.,2022;Manakuletal.,2023).Weempirically
|                |       |       |                |     |         | find that our | prompting | performs | better | due | to the | lack of |
| -------------- | ----- | ----- | -------------- | --- | ------- | ------------- | --------- | -------- | ------ | --- | ------ | ------- |
| This estimator | takes | a set | of generations |     | and au- |               |           |          |        |     |        |         |
controloverthequestionsbeinggenerated.
| tomaticallycomputesa |     |     | FACTSCORE,andcanbe |     |     |     |     |     |     |     |     |     |
| -------------------- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
7InAppendixB.3,wealsocomparewithSelf-checkLM,
appliedtoanyLM . aconcurrentworkfromManakuletal.(2023). Wedonot
SUBJ
includeitinthemainpaperbecauseithasstrongrestrictions,
Wedescribeourmodel(Section4.1)anddemon-
|                                              |     |     |     |     |     | e.g.,requiresaccesstotheLM |     |     | atevaluationtimeandcan- |     |     |     |
| -------------------------------------------- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | ----------------------- | --- | --- | --- |
| strateitsaccuracyagainsthumanevaluation(Sec- |     |     |     |     |     |                            |     |     | SUBJ                    |     |     |     |
notbeappliedtoPerplexityAIwithnondeterministicoutputs.

|     |     |                 |     |       | SUBJ:InstGPT |        |     | SUBJ:ChatGPT |        | SUBJ:PPLAI |        |         |     |     |
| --- | --- | --------------- | --- | ----- | ------------ | ------ | --- | ------------ | ------ | ---------- | ------ | ------- | --- | --- |
|     |     | Evaluator       |     | retrv |              |        |     |              |        |            |        | ranking |     |     |
|     |     |                 |     |       | ER           |        | FS  | ER           | FS     |            | ER     | FS      |     |     |
|     |     | Human           |     |       |              | 42.5   |     |              | 58.3   |            | 71.5   |         |     |     |
|     |     | AlwaysSupported |     |       | 57.5         | 100.0+ |     | 41.7         | 100.0+ | 28.5       | 100.0+ |         | ✗   |     |
laivirT
|     |     | AlwaysNot-supported |     |     | 42.5 | 0.0−  |     | 58.3 | 0.0−  | 71.5 |       | 0.0− | ✗   |     |
| --- | --- | ------------------- | --- | --- | ---- | ----- | --- | ---- | ----- | ---- | ----- | ---- | --- | --- |
|     |     | AlwaysRandom        |     |     | 7.5  | 50.0+ |     | 8.3  | 50.0− | 21.5 | 50.0− |      | ✗   |     |
|     |     | No-contextLM        |     | ✗   | 7.1  | 49.6+ |     | 7.8  | 50.5− | 34.7 | 36.8− |      | ✗   |     |
AMALL-I
|     |         | NP             |     | ✓   | 14.8 | 57.3+ |     | 13.7 | 72.0+ |     | 1.4 72.9  |     | ✓   |     |
| --- | ------- | -------------- | --- | --- | ---- | ----- | --- | ---- | ----- | --- | --------- | --- | --- | --- |
|     |         | Retrieve→LM    |     | ✓   | 14.1 | 56.6+ |     | 17.1 | 75.4+ |     | 0.1 71.6  |     | ✗   |     |
|     |         | Retrieve→LM+NP |     | ✓   | 1.4  | 41.1  |     | 0.4  | 58.7  |     | 9.9 61.6− |     | ✓   |     |
|     |         |                |     | ✗   |      |       |     |      |       |     |           |     | ✗   |     |
|     | TPGtahC | No-contextLM   |     |     | 39.6 | 82.1+ |     | 31.7 | 90.1+ |     | 3.3 74.8  |     |     |     |
|     |         |                |     | ✓   |      |       |     |      |       |     |           |     | ✓   |     |
|     |         | Retrieve→LM    |     |     | 5.1  | 47.6+ |     | 6.8  | 65.1+ |     | 0.8 72.3  |     |     |     |
|     |         |                |     | ✓   |      |       |     |      |       |     |           |     | ✓   |     |
|     |         | Retrieve→LM+NP |     |     | 5.2  | 37.3− |     | 4.7  | 53.6  |     | 8.7 62.8− |     |     |     |
Table3: ResultsonErrorRate(ER)alongwithFACTSCOREsestimatedbyeachmodel(FS).‘retrv’indicates
whetherornotretrievalisbeingused,and‘ranking’✓indicateswhethertherankingbetweenthreeLM
sratedby
SUBJ
themodelisconsistenttothegroundtruthranking.+and−respectivelyindicatetheestimationisanoverestimation
andanunderestimationbymorethan5%inabsolute. RedBoldindicatesthebest(lowest)ER.SeeAppendixB.2
fortheresultsinothermetricsthatconsiderindividualjudgmentsinsteadofaggregatedones.
We use LLAMA 7B trained on Super Natural underestimationof FACTSCORE.
| Instructions                    |     | (Inst-LLAMA, |     | Touvron | et al., | 2023; |                                           |     |        |        |     |       |             |     |
| ------------------------------- | --- | ------------ | --- | ------- | ------- | ----- | ----------------------------------------- | --- | ------ | ------ | --- | ----- | ----------- | --- |
|                                 |     |              |     |         |         |       | ChatGPT                                   |     | is not | always | the | best. | Our results |     |
| Wangetal.,2022)andChatGPTasanLM |     |              |     |         |         | ,and  |                                           |     |        |        |     |       |             |     |
|                                 |     |              |     |         | EVAL    |       | showthatChatGPTisnotnecessarilybetterthan |     |        |        |     |       |             |     |
GeneralizableT5-basedRetrievers(GTR,Nietal.
|                             |     |     |     |                   |     |     | Inst-LLAMA. |     | We      | investigate |         | this further | in        | Ap- |
| --------------------------- | --- | --- | --- | ----------------- | --- | --- | ----------- | --- | ------- | ----------- | ------- | ------------ | --------- | --- |
| (2022))forpassageretrieval. |     |     |     | SeeAppendixB.1for |     |     |             |     |         |             |         |              |           |     |
|                             |     |     |     |                   |     |     | pendix      |     | B.3. In | summary,    | ChatGPT |              | is better | at  |
moreimplementationdetails.
|     |     |     |     |     |     |     | validating |     | each individual |     | atomic | fact. | However, |     |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --- | --------------- | --- | ------ | ----- | -------- | --- |
mosterrorsfromChatGPTareincorrectlyassign-
4.2 EvaluationofEstimators
ingSupportedtounsupportedfacts,overestimat-
Metrics. We report Error Rate (ER)—the dif- ing FACTSCORE. Incontrast,LLAMA+NPisnot
ferencebetweenthegroundtruthandtheestimated biased toward overestimation or underestimation
| FACTSCORE—as |     | well | as whether |     | the estimated |     |     |     |     |     |     |     |     |     |
| ------------ | --- | ---- | ---------- | --- | ------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
ofthefactualprecision,resultinginanaggregated
FACTSCOREspreservetherankingbetweenthree
|     |     |     |     |     |     |     | factual |     | precision | to be | closer | to the | ground truth. |     |
| --- | --- | --- | --- | --- | --- | --- | ------- | --- | --------- | ----- | ------ | ------ | ------------- | --- |
LM s. Appendix B.2 discusses results with This is similar to the trade-off between system-
SUBJ
other metrics that consider individual judgments levelandsegment-levelcorrelationsinsummariza-
| insteadofaggregatedjudgments. |     |     |     | Weusethedata |     |     |     |     |     |     |     |     |     |     |
| ----------------------------- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
tionevaluation,whichoftenproducedifferentrank-
inSection3.3asevaluationdata. ings(Bhandarietal.,2020;Deutschetal.,2021).
ResultsarereportedinTable3.
|     |     |     |     |     |     |     | The | best | estimator | depends |     | on  | the LM | .   |
| --- | --- | --- | --- | --- | --- | --- | --- | ---- | --------- | ------- | --- | --- | ------ | --- |
SUBJ
|                              |     |     |     |                  |     |     | While | using | retrieval | is  | consistently |     | better | than |
| ---------------------------- | --- | --- | --- | ---------------- | --- | --- | ----- | ----- | --------- | --- | ------------ | --- | ------ | ---- |
| Retrievalsignificantlyhelps. |     |     |     | Modelsthatusere- |     |     |       |       |           |     |              |     |        |      |
trievalareconsistentlybetterthanNo-contextLM No-context LM, the best variant of estimator de-
|     |     |     |     |     |     |     | pendsonaLM |     |     | : LLAMA+NPforInstructGPT |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --- | --- | ------------------------ | --- | --- | --- | --- |
whicheitherhasasignificantlyhighERordoesnot
SUBJ
andChatGPT,andChatGPTforPerplexityAI.Nev-
| preserve |     | ranking between | three | LM  | s. This | is  |     |     |     |     |     |     |     |     |
| -------- | --- | --------------- | ----- | --- | ------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
SUBJ
likelybecausetheLM hasnotmemorizedev- ertheless,bothevaluatorsgiveconsistentlycorrect
EVAL
eryfactualinformationaboutthetopicentity,thus ranking between three LM s, and Section 4.3
SUBJ
showscoresfromtwoestimatorsarelargelycorre-
benefitingfromretrievalprovidingfactualcontext.
|              |     |            | Retrieve→LM |     |     |       | latedacross10+LM |     |     |      | s(0.99Pearson’sr). |     |     | We  |
| ------------ | --- | ---------- | ----------- | --- | --- | ----- | ---------------- | --- | --- | ---- | ------------------ | --- | --- | --- |
| Nonetheless, |     | just using |             |     | may | over- |                  |     |     | SUBJ |                    |     |     |     |
estimate FACTSCORE, e.g., by up to 17% with recommenduserstrybothvariantsofourestima-
|             |     |      |      |                |     |     | torwhenevaluatinganewLM |     |     |     |      | andreporttheir |     |     |
| ----------- | --- | ---- | ---- | -------------- | --- | --- | ----------------------- | --- | --- | --- | ---- | -------------- | --- | --- |
| Inst-LLAMA, |     | when | a LM | is InstructGPT |     | or  |                         |     |     |     | SUBJ |                |     |     |
SUBJ
correlation.
ChatGPT.Inthiscase,ensemblingRetrieve→LM
andNPreducesanerrorratebyasignificantmar-
|      |         |     |                            |     |     |     | 4.3 | EvaluationofNewLMs |     |     |     |     |     |     |
| ---- | ------- | --- | -------------------------- | --- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- |
| gin. | WhenaLM |     | isPerplexityAI,singlemeth- |     |     |     |     |                    |     |     |     |     |     |     |
SUBJ
ods (either Retrieve→LM or NP) give a low ER, Ourestimatorallowsevaluatingfactualprecision
andensemblemethodshaveahigherERduetoan ofalargesetofnewLMsatscalewithnohuman

| LM          |     | BaseLM | UseotherLMs |     | Open Release |     | LM    |     | %responding |      | #facts/res |      |
| ----------- | --- | ------ | ----------- | --- | ------------ | --- | ----- | --- | ----------- | ---- | ---------- | ---- |
| SUBJ        |     |        |             |     |              |     | SUBJ  |     |             |      |            |      |
| InstructGPT |     | ?      |             | ?   | ✗ Nov2022    |     | GPT-4 |     |             | 88.2 |            | 60.8 |
✗
| ChatGPT            |     | ?     |             | ?   | Nov2022   |     | Vicuna13B       |     |     | 76.6  |     | 50.9 |
| ------------------ | --- | ----- | ----------- | --- | --------- | --- | --------------- | --- | --- | ----- | --- | ---- |
| GPT-4              |     | ?     |             | ?   | ✗ Mar2023 |     |                 |     |     |       |     |      |
|                    |     |       |             |     |           |     | Vicuna7B        |     |     | 91.0  |     | 45.6 |
| Alpaca{7B,13B,65B} |     | LLAMA | InstructGPT |     | ✓ Mar2023 |     |                 |     |     |       |     |      |
|                    |     |       |             |     | ✓         |     | Oasst-pythia12B |     |     | 100.0 |     | 39.7 |
| Vicuna{7B,13B}     |     | LLAMA | ChatGPT     |     | Mar2023   |     |                 |     |     |       |     |      |
Dolly12B Pythia12B N/A ✓ Mar2023 StableLM-tuned-alpha7B 66.6 38.0
| Oasst-pythia12B |     | Pythia12B |     | N/A | ✓ Mar2023 |     | MPTChat7B |     |     | 88.8 |     | 37.3 |
| --------------- | --- | --------- | --- | --- | --------- | --- | --------- | --- | --- | ---- | --- | ---- |
✓
StableLM-tuned7B StableLM-base ChatGPT,GPT-4 Apr2023 ChatGPT 84.2 37.0
| MPTChat7B |     | MPT7B | ChatGPT |     | ✓ May2023 |     |             |     |     |       |     |      |
| --------- | --- | ----- | ------- | --- | --------- | --- | ----------- | --- | --- | ----- | --- | ---- |
|           |     |       |         |     |           |     | InstructGPT |     |     | 99.8  |     | 27.7 |
|           |     |       |         |     |           |     | Dolly12B    |     |     | 100.0 |     | 24.6 |
Table4: AsetoftwelveLMsevaluatedinSection4.3. Alpaca7B 100.0 17.4
Allmodelsaretunedforinstructionfollowingorchat. Alpaca65B 100.0 17.1
UseotherLMsindicateswhetherthemodelistrainedon Alpaca13B 100.0 16.6
anydatathatincludesoutputsofanothermodel. Open Human 88.8 29.0
indicatesmodelweightsarepubliclyavailable.
Table5: Statisticsof500model-generatedbiosinour
unlabeleddatafrom12LMsaswellashuman-written
efforts. Asacasestudy,weevaluatetennewLMs
bios. %respondingindicates%ofgenerationsthatdo
thatcameoutwithintwomonthsatthetimeofcon- notabstainfromresponding. #facts/resindicates#of
|         |             |        |     |       |          | atomicfactsperresponse. |     |     | LMsaresortedbasedon#of |     |     |     |
| ------- | ----------- | ------ | --- | ----- | -------- | ----------------------- | --- | --- | ---------------------- | --- | --- | --- |
| ducting | experiments | (Table | 4). | These | LMs were |                         |     |     |                        |     |     |     |
evaluatedonmanybenchmarksbutnotinfactual factsperresponse. SeeFigure3fortheirFACTSCOREs.
precisionoflong-formgenerationsincesucheval-
| uation is | costly. | We aim | to provide | new | insights |                          |     |     |     |                       |     |     |
| --------- | ------- | ------ | ---------- | --- | -------- | ------------------------ | --- | --- | --- | --------------------- | --- | --- |
|           |         |        |            |     |          | withnooverlapinentities. |     |     |     | Weadditionallyinclude |     |     |
ontheseLMsbyestimatingFACTSCOREoftheir InstructGPT,ChatGPT,andhuman-writtenbiogra-
long-formgenerations.
|     |     |     |     |     |     | phiesobtainedthroughDBPedia. |     |                  |     |     | Human-written |          |
| --- | --- | --- | --- | --- | --- | ---------------------------- | --- | ---------------- | --- | --- | ------------- | -------- |
|     |     |     |     |     |     | biographies                  |     | were unavailable |     | for | 11% of        | entities |
4.3.1 Setup
whichweconsiderasabstainingfromresponding.
| We evaluate |     | 10 recently-released |     | LMs   | as shown    |                              |     |     |     |                    |     |     |
| ----------- | --- | -------------------- | --- | ----- | ----------- | ---------------------------- | --- | --- | --- | ------------------ | --- | --- |
|             |     |                      |     |       |             | SeeTable5fortheirstatistics. |     |     |     | Intotal,weevaluate |     |     |
| in Table    | 4.  | GPT-4 (OpenAI,       |     | 2023) | is a multi- |                              |     |     |     |                    |     |     |
6,500generationsfrom13subjects,whichwould
modalLMreleasedbyOpenAIavailablethrough
havecost$26Kiftheywereevaluatedbyhumans.
| an API. | Alpaca   | (Taori | et al.,    | 2023)      | is based on |       |         |     |     |     |     |     |
| ------- | -------- | ------ | ---------- | ---------- | ----------- | ----- | ------- | --- | --- | --- | --- | --- |
| LLAMA   | (Touvron | et     | al., 2023) | fine-tuned | on          | 4.3.2 | Results |     |     |     |     |     |
the instructions data based on InstructGPT fol- Figure 3 shows the ranking between 13 subjects
lowing the recipe from Wang et al. (2022). Vi- providedbythetwobestvariantsofourestimator
cuna (Chiang et al., 2023) is based on LLAMA whosescoresarelargelycorrelated,e.g.,havinga
fine-tuned on the outputs from ChatGPT avail- Pearson’srof0.99. Thisevaluationallowsabetter
ablethroughShareGPT.8 Dolly9 isPythia12B(Bi- understandingofthesemodels,including:
| derman | et al., | 2023) fine-tuned |     | on  | DataBricks |       |     |                   |     |      |         |          |
| ------ | ------- | ---------------- | --- | --- | ---------- | ----- | --- | ----------------- | --- | ---- | ------- | -------- |
|        |         |                  |     |     |            | • All | LMs | are substantially |     | less | factual | than hu- |
Dolly,human-writtendatacreatedbyDatabricks.10
|                |     |                               |     |     |     | mans. |     | This is | in contrast | to  | prior work | that |
| -------------- | --- | ----------------------------- | --- | --- | --- | ----- | --- | ------- | ----------- | --- | ---------- | ---- |
| Oasst-pythia11 |     | isPythia12Bfine-tinedonhuman- |     |     |     |       |     |         |             |     |            |      |
claimsLMsapproachhumanperformance,even
Assistant.12
| written | data collected | through |     | Open |     |     |     |     |     |     |     |     |
| ------- | -------------- | ------- | --- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
forcomplextasks(Dingetal.,2022;Norietal.,
| StableLM-tuned-alpha13 |     |     | isbasedonStableLM- |     |     |     |     |     |     |     |     |     |
| ---------------------- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
2023;Leeetal.,2023)eventhoughthetaskof
| base-alpha14 |     | fine-tunedonthedatausedintheAl- |     |     |     |     |     |     |     |     |     |     |
| ------------ | --- | ------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
writingbiographiesisfairlyeasy.
| paca data, | DataBricks | Dolly, |     | the ShareGPT | data, |     |     |     |     |     |     |     |
| ---------- | ---------- | ------ | --- | ------------ | ----- | --- | --- | --- | --- | --- | --- | --- |
• GPT-4andChatGPTarecomparableinfactual
| the GPT4All               |      | data (Anand               | et             | al., 2023) | and An- |                                          |     |                                 |     |     |     |      |
| ------------------------- | ---- | ------------------------- | -------------- | ---------- | ------- | ---------------------------------------- | --- | ------------------------------- | --- | --- | --- | ---- |
|                           |      |                           |                |            |         | precision.                               |     | However,asreportedinTable5,GPT- |     |     |     |      |
| thropicHH(Baietal.,2022). |      |                           | MPTChatisbased |            |         |                                          |     |                                 |     |     |     |      |
|                           |      |                           |                |            |         | 4abstainsfromrespondingless(12%vs.       |     |                                 |     |     |     | 16%) |
| on MPT                    | 7B15 | fine-tuned                | on the         | ShareGPT   | data,   |                                          |     |                                 |     |     |     |      |
|                           |      |                           |                |            |         | andgeneratessignificantlymorefacts(61vs. |     |                                 |     |     |     | 37   |
| theAlpacadata,            |      | AnthropicHH,HC3(Guoetal., |                |            |         |                                          |     |                                 |     |     |     |      |
perresponse).
2023),andEvol-Instruct.16
• GPT-4andChatGPTaresignificantlymorefac-
| WeprompteachLM |       |             | togeneratebiographies |            |         |                       |     |     |     |     |     |     |
| -------------- | ----- | ----------- | --------------------- | ---------- | ------- | --------------------- | --- | --- | --- | --- | --- | --- |
|                |       | SUBJ        |                       |            |         | tualthanpublicmodels. |     |     |     |     |     |     |
| of 500         | human | entities as | done                  | in Section | 3.3 but |                       |     |     |     |     |     |     |
• Withinthesamefamilyofmodelsthatdifferin
8sharegpt.com 9dolly-v2-12b 10databricks.com sizes, there is a clear correlation between the
| 11oasst-sft-1-pythia-12b  |     |     |                          | 12open-assistant.io |     |       |      |     |         |            |       |        |
| ------------------------- | --- | --- | ------------------------ | ------------------- | --- | ----- | ---- | --- | ------- | ---------- | ----- | ------ |
|                           |     |     |                          |                     |     | model | size | and | factual | precision, | e.g., | Alpaca |
| 13StableLM-tuned-alpha-7b |     |     | 14stablelm-base-alpha-7b |                     |     |       |      |     |         |            |       |        |
65B>13B>7B,andVicuna13B>7B.
15mosaicml.com/blog/mpt-7b16evol_instruct_70k

|                  |      | Based on F1 micro  |     |                  |     | Based on ER        |     |
| ---------------- | ---- | ------------------ | --- | ---------------- | --- | ------------------ | --- |
| Human            |      |                    |     | Human            |     |                    |     |
|                  | GPT4 |                    |     | ChatGPT          |     |                    |     |
| ChatGPT          |      |                    |     | GPT4             |     |                    |     |
| Alpaca 65B       |      |                    |     | Alpaca 65B       |     |                    |     |
| InstructGPT      |      |                    |     | InstructGPT      |     |                    |     |
| Alpaca 13B       |      |                    |     | Vicuna 13B       |     |                    |     |
| Vicuna 13B       |      |                    |     | Alpaca 13B       |     |                    |     |
| Alpaca 7B        |      |                    |     | Vicuna 7B        |     |                    |     |
| Vicuna 7B        |      |                    |     | Alpaca 7B        |     |                    |     |
| MPT-Chat 7B      |      |                    |     | MPT-Chat 7B      |     |                    |     |
| Oasst-pythia 12B |      |                    |     | Oasst-pythia 12B |     |                    |     |
| Dolly 12B        |      |                    |     | Dolly 12B        |     |                    |     |
| StableLM 7B      |      |                    |     | StableLM 7B      |     |                    |     |
|                  | 0 20 | 40 60              | 80  | 0                | 20  | 40 60              | 80  |
|                  |      | Est. FActScore (%) |     |                  |     | Est. FActScore (%) |     |
Figure 3: Ranking between 13 subjects (human and 12 LMs), rated by the two best variants of our estimator:
ChatGPT(left)andLLAMA+NP(right),bothwithretrieval. ScoresfromtwometricshaveaPearson’srof0.99.
SeeTable5for%ofrespondingand#ofatomicfactsperresponseofeachLM.Thevarianceinestimationbased
ondifferentsubsetsofpromptsisreportedinFigure5ofAppendixB.4.
• AlpacaandVicunaachieveperformancethatis the case of ChatGPT. Since human evaluation is
veryclosetoeachotherwithinthesamesizeof time-consumingandcostly,weproposedamodel
models, possibly because they share the same that estimates FACTSCORE, allowing an auto-
basemodelandsimilartrainingdata. Nonethe- matic evaluation of FACTSCORE. We found our
less,asshowninTable5,Vicunageneratessig- estimator based on retrieval over a knowledge
nificantly more atomic facts than Alpaca does sourceandcompetitivelanguagemodelsestimates
(51 vs. 17 per response). Also, Alpaca never FACTSCORE closetothegroundtruth,andshow-
abstainsfromansweringwhileVicunadoes. cased its application by evaluating 12 recently-
• Within public models, there are large gaps in releasedLMsthatcouldhavecost$65Kifevalu-
atedbyhumansandprovidinginsightsaboutthem.
| factual | precision even | when the model | size is |             |        |                   |          |
| ------- | -------------- | -------------- | ------- | ----------- | ------ | ----------------- | -------- |
|         |                |                |         | Within four | months | since its initial | release, |
similar,e.g.,withinthe7Bmodels,Alpacaand
Vicuna (∼ 40%) are more factual than MPT- FACTSCORE has actively been used in subse-
quentwork,evaluatingfactualprecisionofrecently-
| Chat(30%)andStableLM(17%). |     | Possiblefac- |     |     |     |     |     |
| -------------------------- | --- | ------------ | --- | --- | --- | --- | --- |
proposedmodels(Yeetal.,2023;Sunetal.,2023;
torsincludethechoiceofthebaseLM,thedata,
andthetrainingrecipe(Hoffmannetal.,2022). Malaviya et al., 2023; Dhuliawala et al., 2023).
|     |     |     |     | Asfuturework,wesuggest: |     | (1)consideringother |     |
| --- | --- | --- | --- | ----------------------- | --- | ------------------- | --- |
We highlight that this evaluation only considers aspectsoffactualitysuchasrecall(coverageoffac-
factualprecision,specificallyinpeoplebiographies. tualinformation);(2)furtherimprovingtheestima-
AholisticevaluationofLMsshouldincludeother torforabetterapproximationoffactualprecision;
aspectsofgenerationssuchasfluency,coherence, and(3)leveragingFACTSCOREtocorrectmodel
relevance,consistencyandcreativity,whichisout generations(brieflyexploredinAppendixC).
ofscopeofthispaper.
Limitations
5 ConclusionandFutureWork
|     |     |     |     | ScopeofFACTSCORE. |     | Allofourexperiments |     |
| --- | --- | --- | --- | ----------------- | --- | ------------------- | --- |
We introduced FACTSCORE, a new evaluation focus on people biographies and Wikipedia, be-
of the factual precision of long-form generation cause many LMs can generate biographies with
from LMs that breaks a generation down into a objectiveandspecificfacts(ratherthansubjective
series of atomic facts and computes a fraction andvagueones)andWikipediahasahighcoverage
of facts supported by a given knowledge source. forthem. FACTSCOREcanbeappliedtoabroader
We first performed extensive human evaluation, domain,e.g.,textaboutrecenteventswhoseknowl-
finding that commercial, state-the-art-art LMs— edge source can be a collection of news articles,
InstructGPT, ChatGPT, and search engine aug- ortextaboutscientificfindingswhoseknowledge
mented,PerplexityAI—makeasubstantialamount source can be a collection of scientific literature.
of errors, e.g., having a FACTSCORE of 58% in WepresentaproofofconceptinAppendixB.5and

leavefurtherstudyforfuturework. Prompt:TellmeabioofMaryIofEngland.
Due to the assumptions made in Section 3.1, Generation: MaryIwasQueenofEnglandandIreland
fromJuly1553untilherdeath.Marywasthedaughterof
| FACTSCORE | isnotapplicablewhenthefactsare |     |     |     |     |     |     |     |     |     |     |     |
| --------- | ------------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
KingHenryVIIIandhisfirstwife,CatherineofAragon.
morenuanced, open-ended, anddebatable(Chen AfterherfatherannulledhismarriagetoCatherine,Mary’s
statuswasindoubt,andshewasexcludedfromthelineof
| et al., 2019; | Xu  | et al., | 2023) | or  | with | a knowl- |     |     |     |     |     |     |
| ------------- | --- | ------- | ----- | --- | ---- | -------- | --- | --- | --- | --- | --- | --- |
succession.Herhalf-brother,EdwardVI,succeededtheir
| edge source | whose | text | frequently |     | conflicts | with |     |     |     |     |     |     |
| ----------- | ----- | ---- | ---------- | --- | --------- | ---- | --- | --- | --- | --- | --- | --- |
fatherin1547,andMaryhadtolivewiththehumiliation
each other (Wadden et al., 2022). Moreover, ofbeingdeclaredillegitimate.
| FACTSCORE | may | not | be suitable |     | for the | human- |     |     |     |     |     |     |
| --------- | --- | --- | ----------- | --- | ------- | ------ | --- | --- | --- | --- | --- | --- |
writtentextthatisnuancedandincludesintentional Table 6: An example whose factual precision is high
|     |     |     |     |     |     |     | butrecallislow. |     | Thegenerationdoesnotmentionhow |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --------------- | --- | ------------------------------ | --- | --- | --- |
orimplicitdeception.
|     |     |     |     |     |     |     | Mary I | of England | got back | to the line | of  | succession |
| --- | --- | --- | --- | --- | --- | --- | ------ | ---------- | -------- | ----------- | --- | ---------- |
andeventuallybecameaqueen.
| Limitationinourestimator. |     |     |     | Whileourestima- |     |     |     |     |     |     |     |     |
| ------------------------- | --- | --- | --- | --------------- | --- | --- | --- | --- | --- | --- | --- | --- |
torcloselyapproximateshumansandprovidescon-
sistentrankingoveralargesetofLMs,itisnotper- Asai, Yanai Elazar, UW NLP members, UMass
fectinindividualjudgments, andthebestvariant NLP members, FAIR lab members for feedback
dependsonthedegreeofhowcloseagenerationis anddiscussiononthepaper.
tohuman-writtentextanditslinguisticcomplexity. This research was supported by NSF IIS-
Future work can investigate how the distribution 2046248, NSF IIS-2202506, NSF IIS-2044660,
ofmodelgenerationaffectstheperformanceofthe ONR N00014-18-1-2826, ONR MURI N00014-
estimatorandfurtherimprovetheestimator. 18-1-2670, DARPAunderContractNo. FA8650-
|                         |                   |     |     |           |       |         | 23-C-7316, | an   | Allen Distinguished |          | Award, | and   |
| ----------------------- | ----------------- | --- | --- | --------- | ----- | ------- | ---------- | ---- | ------------------- | -------- | ------ | ----- |
| Beyondfactualprecision. |                   |     |     | FACTSCORE |       | focuses |            |      |                     |          |        |       |
|                         |                   |     |     |           |       |         | gifts from | AI2. | The views,          | opinions | and/or | find- |
| on factual              | precision—whether |     |     | each      | piece | of in-  |            |      |                     |          |        |       |
ingsexpressedarethoseoftheauthorandshould
| formation | in a | generation | is  | factually |     | supported |     |     |     |     |     |     |
| --------- | ---- | ---------- | --- | --------- | --- | --------- | --- | --- | --- | --- | --- | --- |
notbeinterpretedasrepresentingtheofficialviews
byareliablesourceofknowledge—whichisonly
|                                         |           |     |      |              |     |         | or policies      | of  | the Department | of     | Defense   | or the |
| --------------------------------------- | --------- | --- | ---- | ------------ | --- | ------- | ---------------- | --- | -------------- | ------ | --------- | ------ |
| oneaspectofthebroaderfactualityproblem. |           |     |      |              |     | For     |                  |     |                |        |           |        |
|                                         |           |     |      |              |     |         | U.S. Government. |     | Sewon          | Min is | supported | by a   |
| instance,                               | FACTSCORE |     | does | not consider |     | factual |                  |     |                |        |           |        |
J.P.Morganfellowship,andKalpeshKrishnawas
| recall: | the coverage | of  | information |     | in  | a genera- |     |     |     |     |     |     |
| ------- | ------------ | --- | ----------- | --- | --- | --------- | --- | --- | --- | --- | --- | --- |
supportedbytheGooglePhDFellowship.
tion. FACTSCOREdoesnotpenalizeamodelthat
abstainsfromrespondingtoofrequentlyorgener-
atesfewerfacts,whichcanbeunfairsincethereis
References
aninherenttrade-offbetweenprecisionandrecall.
Moreover,theboundarybetweenprecisionandre- Yuvanesh Anand, Zach Nussbaum, Brandon Duder-
stadt,BenjaminSchmidt,andAndriyMulyar.2023.
callisoftenblurry,e.g.,itispossiblethat,evenif
Gpt4all:Traininganassistant-stylechatbotwithlarge
everypieceofinformationinagenerationissup-
|     |     |     |     |     |     |     | scale | data distillation | from | gpt-3.5-turbo. |     | https: |
| --- | --- | --- | --- | --- | --- | --- | ----- | ----------------- | ---- | -------------- | --- | ------ |
ported,itmissesasignificantpieceofinformation //github.com/nomic-ai/gpt4all.
thatshouldhavebeenmentionedinordertobecon-
sideredascorrectlyrespondingtotheinputprompt Yuntao Bai, Andy Jones, Kamal Ndousse, Amanda
|          |          |     |     |       |        |          | Askell, | AnnaChen, | NovaDasSarma, |     | DawnDrain, |     |
| -------- | -------- | --- | --- | ----- | ------ | -------- | ------- | --------- | ------------- | --- | ---------- | --- |
| (example | in Table | 6). | We  | leave | a more | holistic |         |           |               |     |            |     |
StanislavFort,DeepGanguli,TomHenighan,etal.
| evaluation | of factuality |     | for | future | work, | and rec- |     |     |     |     |     |     |
| ---------- | ------------- | --- | --- | ------ | ----- | -------- | --- | --- | --- | --- | --- | --- |
2022. Trainingahelpfulandharmlessassistantwith
ommendreporting FACTSCORE togetherwiththe reinforcementlearningfromhumanfeedback. arXiv
preprintarXiv:2204.05862.
%ofabstentionandtheaveragenumberofatomic
facts(aswedidinSection4.3).
|     |     |     |     |     |     |     | Manik Bhandari, |     | Pranav Narayan  | Gour,   | Atabak | Ash-      |
| --- | --- | --- | --- | --- | --- | --- | --------------- | --- | --------------- | ------- | ------ | --------- |
|     |     |     |     |     |     |     | faq, Pengfei    |     | Liu, and Graham | Neubig. |        | 2020. Re- |
Acknowledgement
|     |     |     |     |     |     |     | evaluatingevaluationintextsummarization. |     |     |     |     | InPro- |
| --- | --- | --- | --- | --- | --- | --- | ---------------------------------------- | --- | --- | --- | --- | ------ |
ceedingsofEmpiricalMethodsinNaturalLanguage
| We thank | Yizhong | Wang | for | sharing | Instruction- |     |     |     |     |     |     |     |
| -------- | ------- | ---- | --- | ------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
Processing.
| tuned LLAMA |     | and Alpaca |     | models | with | varying |     |     |     |     |     |     |
| ----------- | --- | ---------- | --- | ------ | ---- | ------- | --- | --- | --- | --- | --- | --- |
sizes,andforsharingfeedbackontheFACTSCORE StellaBiderman,HaileySchoelkopf,QuentinAnthony,
Pythonpackage. WethankexpertsinUpworkfor Herbie Bradley, Kyle O’Brien, Eric Hallahan, Mo-
hammadAflahKhan,ShivanshuPurohit,USVSNSai
annotatingthedata,andDhrubaGhosh,Jiacheng
|     |     |     |     |     |     |     | Prashanth,EdwardRaff,etal.2023. |     |     |     | Pythia: | Asuite |
| --- | --- | --- | --- | --- | --- | --- | ------------------------------- | --- | --- | --- | ------- | ------ |
Liu and Zeqiu Wu for participating in pilot an- foranalyzinglargelanguagemodelsacrosstraining
| notation | and sharing |     | feedback. | We  | thank | Akari |             |     |                                |     |     |     |
| -------- | ----------- | --- | --------- | --- | ----- | ----- | ----------- | --- | ------------------------------ | --- | --- | --- |
|          |             |     |           |     |       |       | andscaling. |     | arXivpreprintarXiv:2304.01373. |     |     |     |

Bernd Bohnet, Vinh Tran, Pat Verga, Roee Aha- AlexanderFabbri,Chien-ShengWu,WenhaoLiu,and
roni,DanielAndor,LivioBaldiniSoares,Massimil- CaimingXiong.2022. QAFactEval: ImprovedQA-
ianoCiaramita,JacobEisenstein,KuzmanGanchev, basedfactualconsistencyevaluationforsummariza-
JonathanHerzig,KaiHui,TomKwiatkowski,JiMa, tion. InConferenceoftheNorthAmericanChapter
JianmoNi,TalSchuster,LierniSestorainSaralegui, oftheAssociationforComputationalLinguistics.
WilliamWestonCohen,MichaelCollins,Dipanjan
|     |     |     |     |     |     |     | Angela Fan, | Aleksandra |     | Piktus, | Fabio Petroni, | Guil- |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ---------- | --- | ------- | -------------- | ----- |
Das,DonMetzler,SlavPetrov,andKellieWebster.
2022. Attributedquestionanswering:Evaluationand laume Wenzek, Marzieh Saeidi, Andreas Vlachos,
modelingforattributedlargelanguagemodels. arXiv AntoineBordes,andSebastianRiedel.2020. Gener-
preprintarXiv:2212.08037. atingfactcheckingbriefs. InProceedingsofEmpiri-
calMethodsinNaturalLanguageProcessing.
TomB.Brown,BenjaminMann,NickRyder,Melanie
|          |       |         |          |           |     |        | Luyu Gao, | Zhuyun | Dai,              | Panupong | Pasupat, | Anthony   |
| -------- | ----- | ------- | -------- | --------- | --- | ------ | --------- | ------ | ----------------- | -------- | -------- | --------- |
| Subbiah, | Jared | Kaplan, | Prafulla | Dhariwal, |     | Arvind |           |        |                   |          |          |           |
|          |       |         |          |           |     |        | Chen,     | Arun   | Tejasvi Chaganty, |          | Yicheng  | Fan, Vin- |
Neelakantan,PranavShyam,GirishSastry,Amanda
Askell, Sandhini Agarwal, Ariel Herbert-Voss, cent Y Zhao, Ni Lao, Hongrae Lee, Da-Cheng
Gretchen Krueger, Tom Henighan, Rewon Child, Juan, et al. 2022. Attributed text generation via
|        |         |        |     |          |         |     | post-hoc | research | and | revision. | arXiv | preprint |
| ------ | ------- | ------ | --- | -------- | ------- | --- | -------- | -------- | --- | --------- | ----- | -------- |
| Aditya | Ramesh, | Daniel | M.  | Ziegler, | Jeffrey | Wu, |          |          |     |           |       |          |
arXiv:2210.08726.
ClemensWinter,ChristopherHesse,MarkChen,Eric
Sigler,MateuszLitwin,ScottGray,BenjaminChess,
TianyuGao,HowardYen,JiatongYu,andDanqiChen.
| Jack Clark, | Christopher |     | Berner, | Sam | McCandlish, |     |     |     |     |     |     |     |
| ----------- | ----------- | --- | ------- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
2023. Enablinglargelanguagemodelstogenerate
| Alec Radford, |     | Ilya | Sutskever, | and | Dario | Amodei. |     |     |     |     |     |     |
| ------------- | --- | ---- | ---------- | --- | ----- | ------- | --- | --- | --- | --- | --- | --- |
textwithcitations.
| 2020. | Language | models | are | few-shot | learners. | In  |     |     |     |     |     |     |
| ----- | -------- | ------ | --- | -------- | --------- | --- | --- | --- | --- | --- | --- | --- |
ProceedingsofAdvancesinNeuralInformationPro- Biyang Guo, Xin Zhang, Ziyuan Wang, Minqi Jiang,
cessingSystems.
JinranNie,YuxuanDing,JianweiYue,andYupeng
|     |     |     |     |     |     |     | Wu.2023. | Howcloseischatgpttohumanexperts? |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | -------- | -------------------------------- | --- | --- | --- | --- |
DanqiChen,AdamFisch,JasonWeston,andAntoine
|              |     |                               |     |     |     |     | comparisoncorpus,evaluation,anddetection. |     |     |     |     | arXiv |
| ------------ | --- | ----------------------------- | --- | --- | --- | --- | ----------------------------------------- | --- | --- | --- | --- | ----- |
| Bordes.2017. |     | ReadingWikipediatoansweropen- |     |     |     |     |                                           |     |     |     |     |       |
preprintarxiv:2301.07597.
| domainquestions. |     | InProceedingsoftheAssociation |     |     |     |     |     |     |     |     |     |     |
| ---------------- | --- | ----------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
forComputationalLinguistics. Kelvin Guu, Tatsunori B. Hashimoto, Yonatan Oren,
|     |     |     |     |     |     |     | and Percy | Liang. | 2018. | Generating | sentences | by  |
| --- | --- | --- | --- | --- | --- | --- | --------- | ------ | ----- | ---------- | --------- | --- |
JifanChen,AniruddhSriram,EunsolChoi,andGreg editingprototypes. TransactionsoftheAssociation
| Durrett. | 2022. | Generating |     | literal | and implied | sub- |     |     |     |     |     |     |
| -------- | ----- | ---------- | --- | ------- | ----------- | ---- | --- | --- | --- | --- | --- | --- |
forComputationalLinguistics.
| questionstofact-checkcomplexclaims. |     |     |     |     | InProceed- |     |     |     |     |     |     |     |
| ----------------------------------- | --- | --- | --- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
ingsofEmpiricalMethodsinNaturalLanguagePro-
JordanHoffmann,SebastianBorgeaud,ArthurMensch,
cessing.
|     |     |     |     |     |     |     | Elena | Buchatskaya, | Trevor |     | Cai, Eliza | Rutherford, |
| --- | --- | --- | --- | --- | --- | --- | ----- | ------------ | ------ | --- | ---------- | ----------- |
DiegodelasCasas,LisaAnneHendricks,Johannes
| Sihao Chen, | Daniel | Khashabi, |     | Wenpeng | Yin, | Chris |        |       |            |           |      |         |
| ----------- | ------ | --------- | --- | ------- | ---- | ----- | ------ | ----- | ---------- | --------- | ---- | ------- |
|             |        |           |     |         |      |       | Welbl, | Aidan | Clark, Tom | Hennigan, | Eric | Noland, |
Callison-Burch,andDanRoth.2019. Seeingthings KatherineMillican,GeorgevandenDriessche,Bog-
fromadifferentangle:discoveringdiverseperspec-
|                   |     |                             |     |     |     |     | dan Damoc, |     | Aurelia Guy, | Simon | Osindero, | Karen |
| ----------------- | --- | --------------------------- | --- | --- | --- | --- | ---------- | --- | ------------ | ----- | --------- | ----- |
| tivesaboutclaims. |     | InConferenceoftheNorthAmer- |     |     |     |     |            |     |              |       |           |       |
Simonyan,ErichElsen,OriolVinyals,JackWilliam
icanChapteroftheAssociationforComputational
|     |     |     |     |     |     |     | Rae,andLaurentSifre.2022. |     |     |     | Anempiricalanalysis |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------------- | --- | --- | --- | ------------------- | --- |
Linguistics.
ofcompute-optimallargelanguagemodeltraining.
InAdvancesinNeuralInformationProcessingSys-
| Wei-Lin | Chiang, | Zhuohan | Li, | Zi Lin, | Ying | Sheng, | tems. |     |     |     |     |     |
| ------- | ------- | ------- | --- | ------- | ---- | ------ | ----- | --- | --- | --- | --- | --- |
ZhanghaoWu,HaoZhang,LianminZheng,Siyuan
Zhuang,YonghaoZhuang,JosephE.Gonzalez,Ion SauravKadavath,TomConerly,AmandaAskell,Tom
| Stoica, | and Eric | P. Xing. | 2023. | Vicuna: |     | An open- |           |      |        |       |        |          |
| ------- | -------- | -------- | ----- | ------- | --- | -------- | --------- | ---- | ------ | ----- | ------ | -------- |
|         |          |          |       |         |     |          | Henighan, | Dawn | Drain, | Ethan | Perez, | Nicholas |
sourcechatbotimpressinggpt-4with90%*chatgpt
|     |     |     |     |     |     |     | Schiefer, | Zac | Hatfield | Dodds, | Nova | DasSarma, |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | -------- | ------ | ---- | --------- |
quality.
|                 |     |       |               |     |     |           | Eli Tran-Johnson, |      | et al. | 2022.      | Language | models   |
| --------------- | --- | ----- | ------------- | --- | --- | --------- | ----------------- | ---- | ------ | ---------- | -------- | -------- |
|                 |     |       |               |     |     |           | (mostly)          | know | what   | they know. | arXiv    | preprint |
| Daniel Deutsch, |     | Tania | Bedrax-Weiss, |     | and | Dan Roth. | arXiv:2207.05221. |      |        |            |          |          |
2021. Towardsquestion-answeringasanautomatic
metric for evaluating the content quality of a sum- Ryo Kamoi, Tanya Goyal, Juan Diego Rodriguez,
mary. TransactionsoftheAssociationforComputa- and Greg Durrett. 2023. Wice: Real-world en-
tionalLinguistics.
|     |     |     |     |     |     |     | tailment | for | claims in | wikipedia. | arXiv | preprint |
| --- | --- | --- | --- | --- | --- | --- | -------- | --- | --------- | ---------- | ----- | -------- |
arXiv:2303.01432.
| Shehzaad | Dhuliawala, |     | Mojtaba | Komeili, |     | Jing Xu, |     |     |     |     |     |     |
| -------- | ----------- | --- | ------- | -------- | --- | -------- | --- | --- | --- | --- | --- | --- |
RobertaRaileanu,XianLi,AsliCelikyilmaz,andJa- Nikhil Kandpal, Haikang Deng, Adam Roberts, Eric
sonWeston.2023. Chain-of-verificationreduceshal- Wallace, and Colin Raffel. 2022. Large language
lucinationinlargelanguagemodels. arXivpreprint modelsstruggletolearnlong-tailknowledge. arXiv
| arXiv:2309.11495. |     |     |     |     |     |     | preprintarXiv:2211.08411. |     |     |     |     |     |
| ----------------- | --- | --- | --- | --- | --- | --- | ------------------------- | --- | --- | --- | --- | --- |
BoshengDing,ChengweiQin,LinlinLiu,LidongBing, KalpeshKrishna,ErinBransom,BaileyKuehl,Mohit
ShafiqJoty, andBoyangLi.2022. Isgpt-3agood Iyyer,PradeepDasigi,ArmanCohan,andKyleLo.
dataannotator? arXivpreprintarXiv:2212.10450. 2023. LongEval: Guidelinesforhumanevaluation

offaithfulnessinlong-formsummarization. InPro- PotsaweeManakul,AdianLiusie,andMarkJFGales.
ceedingsoftheEuropeanChapteroftheAssociation 2023. Selfcheckgpt: Zero-resource black-box hal-
forComputationalLinguistics. lucination detection for generative large language
|     |     |     |     |     |     | models. | arXivpreprintarXiv:2303.08896. |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ------- | ------------------------------ | --- | --- | --- | --- | --- |
WojciechKryscinski,BryanMcCann,CaimingXiong,
| and Richard |     | Socher.     | 2020. Evaluating |                | the factual |            |            |      |             |            |            |      |
| ----------- | --- | ----------- | ---------------- | -------------- | ----------- | ---------- | ---------- | ---- | ----------- | ---------- | ---------- | ---- |
|             |     |             |                  |                |             | Tsvetomila | Mihaylova, |      | Georgi      | Karadzhov, |            | Pepa |
| consistency | of  | abstractive | text             | summarization. | In          |            |            |      |             |            |            |      |
|             |     |             |                  |                |             | Atanasova, |            | Ramy | Baly, Mitra |            | Mohtarami, | and  |
ProceedingsofEmpiricalMethodsinNaturalLan-
|                  |     |     |     |     |     | Preslav                                     | Nakov. | 2019. | SemEval-2019 |     | task | 8: Fact |
| ---------------- | --- | --- | --- | --- | --- | ------------------------------------------- | ------ | ----- | ------------ | --- | ---- | ------- |
| guageProcessing. |     |     |     |     |     | checkingincommunityquestionansweringforums. |        |       |              |     |      |         |
InProceedingsofthe13thInternationalWorkshop
PhilippeLaban,TobiasSchnabel,PaulN.Bennett,and
onSemanticEvaluation.
| MartiA.Hearst.2022. |     |     | SummaC:Re-visitingNLI- |     |     |     |     |     |     |     |     |     |
| ------------------- | --- | --- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
basedmodelsforinconsistencydetectioninsumma-
SewonMin,WeijiaShi,MikeLewis,XilunChen,Wen-
| rization. | TransactionsoftheAssociationforCompu- |     |     |     |     |     |     |     |     |     |     |     |
| --------- | ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
tauYih,HannanehHajishirzi,andLukeZettlemoyer.
tationalLinguistics.
|     |     |     |     |     |     | 2023.       | Nonparametric |        | masked      | language |               | modeling. |
| --- | --- | --- | --- | --- | --- | ----------- | ------------- | ------ | ----------- | -------- | ------------- | --------- |
|     |     |     |     |     |     | In Findings |               | of the | Association | for      | Computational |           |
NayeonLee,WeiPing,PengXu,MostofaPatwary,Pas-
|            |                                     |     |     |                |     | Linguistics: |     | ACL. |     |     |     |     |
| ---------- | ----------------------------------- | --- | --- | -------------- | --- | ------------ | --- | ---- | --- | --- | --- | --- |
| caleFung,  | MohammadShoeybi,                    |     |     | andBryanCatan- |     |              |     |      |     |     |     |     |
| zaro.2022. | Factualityenhancedlanguagemodelsfor |     |     |                |     |              |     |      |     |     |     |     |
PreslavNakov,AlbertoBarrón-Cedeno,TamerElsayed,
| open-endedtextgeneration. |     |     | InAdvancesinNeural |     |     |               |     |               |     |                 |     |     |
| ------------------------- | --- | --- | ------------------ | --- | --- | ------------- | --- | ------------- | --- | --------------- | --- | --- |
|                           |     |     |                    |     |     | ReemSuwaileh, |     | LluísMàrquez, |     | WajdiZaghouani, |     |     |
InformationProcessingSystems.
|     |     |     |     |     |     | Pepa               | Atanasova, |     | Spas Kyuchukov,        |     | and | Giovanni |
| --- | --- | --- | --- | --- | --- | ------------------ | ---------- | --- | ---------------------- | --- | --- | -------- |
|     |     |     |     |     |     | DaSanMartino.2018. |            |     | Overviewoftheclef-2018 |     |     |          |
PeterLee,SebastienBubeck,andJosephPetro.2023.
|              |         |                              |     |     |     | checkthat!               | labonautomaticidentificationandverifi- |     |                       |     |     |     |
| ------------ | ------- | ---------------------------- | --- | --- | --- | ------------------------ | -------------------------------------- | --- | --------------------- | --- | --- | --- |
| Benefits,    | limits, | andrisksofgpt-4asanaichatbot |     |     |     |                          |                                        |     |                       |     |     |     |
|              |         |                              |     |     |     | cationofpoliticalclaims. |                                        |     | InExperimentalIRMeets |     |     |     |
| formedicine. |         | NewEnglandJournalofMedicine. |     |     |     |                          |                                        |     |                       |     |     |     |
Multilinguality,Multimodality,andInteraction.
| Jimmy Lin, | Xueguang |     | Ma, Sheng-Chieh |     | Lin, Jheng- |     |     |     |     |     |     |     |
| ---------- | -------- | --- | --------------- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
HongYang,RonakPradeep,andRodrigoNogueira. AniNenkovaandRebeccaPassonneau.2004. Evaluat-
2021. Pyserini: A Python toolkit for reproducible ingcontentselectioninsummarization: Thepyramid
informationretrievalresearchwithsparseanddense method. InConferenceoftheNorthAmericanChap-
representations. InProceedingsoftheACMSIGIR teroftheAssociationforComputationalLinguistics.
ConferenceonResearchandDevelopmentinInfor-
mationRetrieval. Jianmo Ni, Chen Qu, Jing Lu, Zhuyun Dai, Gustavo
|     |     |     |     |     |     | HernandezAbrego, |     |     | JiMa, | VincentZhao, |     | YiLuan, |
| --- | --- | --- | --- | --- | --- | ---------------- | --- | --- | ----- | ------------ | --- | ------- |
NelsonFLiu,TianyiZhang,andPercyLiang.2023a. KeithHall,Ming-WeiChang,andYinfeiYang.2022.
Evaluatingverifiabilityingenerativesearchengines. Largedualencodersaregeneralizableretrievers. In
arXivpreprintarXiv:2304.09848. ProceedingsofEmpiricalMethodsinNaturalLan-
guageProcessing.
| Yang Liu,  | Dan                            | Iter, Yichong | Xu,   | Shuohang    | Wang, |                                        |               |     |                     |     |       |           |
| ---------- | ------------------------------ | ------------- | ----- | ----------- | ----- | -------------------------------------- | ------------- | --- | ------------------- | --- | ----- | --------- |
| Ruochen    | Xu,                            | and Chenguang |       | Zhu. 2023b. | Gpte- |                                        |               |     |                     |     |       |           |
|            |                                |               |       |             |       | HarshaNori,                            | NicholasKing, |     | ScottMayerMcKinney, |     |       |           |
| val: Nlg   | evaluation                     | using         | gpt-4 | with better | human |                                        |               |     |                     |     |       |           |
|            |                                |               |       |             |       | Dean                                   | Carignan,     | and | Eric Horvitz.       |     | 2023. | Capabili- |
| alignment. | arXivpreprintarXiv:2303.16634. |               |       |             |       |                                        |               |     |                     |     |       |           |
|            |                                |               |       |             |       | tiesofgpt-4onmedicalchallengeproblems. |               |     |                     |     |       | arXiv     |
preprintarXiv:2303.13375.
YixinLiu,AlexanderRFabbri,PengfeiLiu,YilunZhao,
LinyongNan,RuilinHan,SimengHan,ShafiqJoty,
|                                       |     |     |     |     |     | OpenAI.2022. |     | Chatgptblogpost. |     | https://openai. |     |     |
| ------------------------------------- | --- | --- | --- | --- | --- | ------------ | --- | ---------------- | --- | --------------- | --- | --- |
| Chien-ShengWu,CaimingXiong,etal.2022. |     |     |     |     | Re- |              |     |                  |     |                 |     |     |
com/blog/chatgpt.
| visiting                                 | the gold | standard: | Grounding |     | summariza- |              |     |                       |     |     |               |     |
| ---------------------------------------- | -------- | --------- | --------- | --- | ---------- | ------------ | --- | --------------------- | --- | --- | ------------- | --- |
| tionevaluationwithrobusthumanevaluation. |          |           |           |     | arXiv      |              |     |                       |     |     |               |     |
|                                          |          |           |           |     |            | OpenAI.2023. |     | Gpt-4technicalreport. |     |     | arXivpreprint |     |
preprintarXiv:2212.07981.
arXiv:2303.08774.
QingsongMa,JohnnyWei,OndˇrejBojar,andYvette
LongOuyang,JeffreyWu,XuJiang,DiogoAlmeida,
| Graham. | 2019. | Results | of  | the WMT19 | metrics |     |     |     |     |     |     |     |
| ------- | ----- | ------- | --- | --------- | ------- | --- | --- | --- | --- | --- | --- | --- |
CarrollWainwright,PamelaMishkin,ChongZhang,
| sharedtask: |     | Segment-levelandstrongMTsystems |     |     |     |     |     |     |     |     |     |     |
| ----------- | --- | ------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
SandhiniAgarwal,KatarinaSlama,AlexGray,John
| pose | big challenges. |     | In Proceedings | of  | the Fourth |     |     |     |     |     |     |     |
| ---- | --------------- | --- | -------------- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
Schulman,JacobHilton,FraserKelton,LukeMiller,
ConferenceonMachineTranslation.
|     |     |     |     |     |     | Maddie | Simens, | Amanda |     | Askell, | Peter | Welinder, |
| --- | --- | --- | --- | --- | --- | ------ | ------- | ------ | --- | ------- | ----- | --------- |
ChaitanyaMalaviya,SubinLee,SihaoChen,Elizabeth Paul Christiano, Jan Leike, and Ryan Lowe. 2022.
Traininglanguagemodelstofollowinstructionswith
| Sieber, | Mark                                    | Yatskar, | and Dan | Roth. | 2023. Ex- |       |           |     |                |     |             |     |
| ------- | --------------------------------------- | -------- | ------- | ----- | --------- | ----- | --------- | --- | -------------- | --- | ----------- | --- |
|         |                                         |          |         |       |           | human | feedback. |     | In Proceedings |     | of Advances | in  |
| pertqa: | Expert-curatedquestionsandattributedan- |          |         |       |           |       |           |     |                |     |             |     |
NeuralInformationProcessingSystems.
swers. arXivpreprintarXiv:2309.07852.
AlexMallen,AkariAsai,VictorZhong,RajarshiDas, Artidoro Pagnoni, Vidhisha Balachandran, and Yulia
Daniel Khashabi, and Hannaneh Hajishirzi. 2023. Tsvetkov.2021. Understandingfactualityinabstrac-
When not to trust language models: Investigating tivesummarizationwithFRANK:Abenchmarkfor
effectivenessofparametricandnon-parametricmem- factualitymetrics. InConferenceoftheNorthAmer-
ories. InProceedingsoftheAssociationforCompu- icanChapteroftheAssociationforComputational
| tationalLinguistics. |     |     |     |     |     | Linguistics. |     |     |     |     |     |     |
| -------------------- | --- | --- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- |

FabioPetroni,AleksandraPiktus,AngelaFan,Patrick Faisal Azhar, et al. 2023. Llama: Open and effi-
Lewis,MajidYazdani,NicolaDeCao,JamesThorne, cient foundation language models. arXiv preprint
| YacineJernite,VladimirKarpukhin,JeanMaillard, |     |     |     |     |     | arXiv:2302.13971. |     |     |     |     |     |
| --------------------------------------------- | --- | --- | --- | --- | --- | ----------------- | --- | --- | --- | --- | --- |
VassilisPlachouras,TimRocktäschel,andSebastian
|                         |       |         |                        |     |               | David Wadden,            |           | Shanchuan | Lin,           | Kyle Lo,     | Lucy Lu |
| ----------------------- | ----- | ------- | ---------------------- | --- | ------------- | ------------------------ | --------- | --------- | -------------- | ------------ | ------- |
| Riedel.                 | 2021. | KILT: a | benchmark              |     | for knowledge |                          |           |           |                |              |         |
|                         |       |         |                        |     |               | Wang,                    | Madeleine | van       | Zuylen,        | Arman Cohan, | and     |
| intensivelanguagetasks. |       |         | InConferenceoftheNorth |     |               |                          |           |           |                |              |         |
|                         |       |         |                        |     |               | HannanehHajishirzi.2020. |           |           | Factorfiction: |              | Verify- |
AmericanChapteroftheAssociationforComputa-
tionalLinguistics. ing scientific claims. In Proceedings of Empirical
MethodsinNaturalLanguageProcessing.
PranavRajpurkar,JianZhang,KonstantinLopyrev,and
PercyLiang.2016. SQuAD:100,000+questionsfor DavidWadden,KyleLo,BaileyKuehl,ArmanCohan,
machinecomprehensionoftext. InProceedingsof IzBeltagy,LucyLuWang,andHannanehHajishirzi.
|     |     |     |     |     |     | 2022. | SciFact-open: | Towardsopen-domainscientific |     |     |     |
| --- | --- | --- | --- | --- | --- | ----- | ------------- | ---------------------------- | --- | --- | --- |
EmpiricalMethodsinNaturalLanguageProcessing.
|                 |         |          |           |          |           | claimverification.        |               | InFindingsoftheAssociationfor |                    |     |     |
| --------------- | ------- | -------- | --------- | -------- | --------- | ------------------------- | ------------- | ----------------------------- | ------------------ | --- | --- |
|                 |         |          |           |          |           | ComputationalLinguistics: |               |                               | EMNLP.             |     |     |
| Hannah Rashkin, |         | Vitaly   | Nikolaev, | Matthew  | Lamm,     |                           |               |                               |                    |     |     |
| Lora Aroyo,     | Michael | Collins, |           | Dipanjan | Das, Slav |                           |               |                               |                    |     |     |
|                 |         |          |           |          |           | AlexWang,                 | KyunghyunCho, |                               | andMikeLewis.2020. |     |     |
Petrov,GauravSinghTomar,IuliaTurc,andDavid
Reitter. 2021. Measuring attribution in natu- Askingandansweringquestionstoevaluatethefac-
ral language generation models. arXiv preprint tualconsistencyofsummaries. InProceedingsofthe
| arXiv:2112.12870. |     |     |     |     |     | AssociationforComputationalLinguistics. |     |     |     |     |     |
| ----------------- | --- | --- | --- | --- | --- | --------------------------------------- | --- | --- | --- | --- | --- |
ShadenShaar,FirojAlam,GiovanniDaSanMartino, Yizhong Wang, Swaroop Mishra, Pegah Alipoormo-
labashi,YeganehKordi,AmirrezaMirzaei,Atharva
| and Preslav | Nakov.     | 2022.        | The | role    | of context in |        |            |        |             |               |         |
| ----------- | ---------- | ------------ | --- | ------- | ------------- | ------ | ---------- | ------ | ----------- | ------------- | ------- |
|             |            |              |     |         |               | Naik,  | Arjun      | Ashok, | Arut Selvan | Dhanasekaran, |         |
| detecting   | previously | fact-checked |     | claims. | In Find-      |        |            |        |             |               |         |
|             |            |              |     |         |               | Anjana | Arunkumar, |        | David Stap, | Eshaan        | Pathak, |
ingsoftheAssociationforComputationalLinguistics:
| NAACL2022. |     |     |     |     |     | Giannis | Karamanolakis, |     | Haizhi | Lai, Ishan | Puro- |
| ---------- | --- | --- | --- | --- | --- | ------- | -------------- | --- | ------ | ---------- | ----- |
hit,IshaniMondal,JacobAnderson,KirbyKuznia,
OriShapira,DavidGabay,YangGao,HadarRonen,Ra- Krima Doshi, Kuntal Kumar Pal, Maitreya Patel,
makanthPasunuru,MohitBansal,YaelAmsterdamer, MehradMoradshahi,MihirParmar,MiraliPurohit,
NeerajVarshney,PhaniRohithaKaza,PulkitVerma,
| and Ido | Dagan. | 2019. | Crowdsourcing |     | lightweight |     |     |     |     |     |     |
| ------- | ------ | ----- | ------------- | --- | ----------- | --- | --- | --- | --- | --- | --- |
pyramidsformanualsummaryevaluation. InConfer- RavsehajSinghPuri,RushangKaria,SavanDoshi,
enceoftheNorthAmericanChapteroftheAssocia- Shailaja Keyur Sampat, Siddhartha Mishra, Sujan
tionforComputationalLinguistics. ReddyA,SumantaPatro,TanayDixit,andXudong
|     |     |     |     |     |     | Shen.2022. | Super-NaturalInstructions: |     |     |     | Generaliza- |
| --- | --- | --- | --- | --- | --- | ---------- | -------------------------- | --- | --- | --- | ----------- |
KurtShuster,SpencerPoff,MoyaChen,DouweKiela, tionviadeclarativeinstructionson1600+NLPtasks.
and Jason Weston. 2021. Retrieval augmentation InProceedingsofEmpiricalMethodsinNaturalLan-
| reduces | hallucination | in  | conversation. |     | In Findings |     |     |     |     |     |     |
| ------- | ------------- | --- | ------------- | --- | ----------- | --- | --- | --- | --- | --- | --- |
guageProcessing.
| of the Association |     | for | Computational |     | Linguistics: |                                              |     |     |                         |     |     |
| ------------------ | --- | --- | ------------- | --- | ------------ | -------------------------------------------- | --- | --- | ----------------------- | --- | --- |
| EMNLP2021.         |     |     |               |     |              | JohnWieting,KevinGimpel,GrahamNeubig,andTay- |     |     |                         |     |     |
|                    |     |     |               |     |              | lorBerg-kirkpatrick.2022.                    |     |     | Paraphrasticrepresenta- |     |     |
Simeng Sun, Dhawal Gupta, and Mohit Iyyer. 2023. tionsatscale. InProceedingsofthe2022Conference
Exploringtheimpactoflow-rankadaptationonthe onEmpiricalMethodsinNaturalLanguageProcess-
performance, efficiency, and regularization of rlhf. ing: SystemDemonstrations.
arXivpreprintarXiv:2309.09055.
DustinWright,DavidWadden,KyleLo,BaileyKuehl,
Rohan Taori, Ishaan Gulrajani, Tianyi Zhang, Yann Arman Cohan, Isabelle Augenstein, and Lucy Lu
Dubois,XuechenLi,CarlosGuestrin,PercyLiang,
|     |     |     |     |     |     | Wang.2022. |     | Generatingscientificclaimsforzero- |     |     |     |
| --- | --- | --- | --- | --- | --- | ---------- | --- | ---------------------------------- | --- | --- | --- |
andTatsunoriB.Hashimoto.2023. Stanfordalpaca: shotscientificfactchecking. InProceedingsofthe
An instruction-following llama model. https:// AssociationforComputationalLinguistics.
github.com/tatsu-lab/stanford_alpaca.
|     |     |     |     |     |     | Fangyuan | Xu, Yixiao | Song, | Mohit | Iyyer, | and Eunsol |
| --- | --- | --- | --- | --- | --- | -------- | ---------- | ----- | ----- | ------ | ---------- |
BrianThompsonandMattPost.2020. Automaticma- Choi.2023. Acriticalevaluationofevaluationsfor
chinetranslationevaluationinmanylanguagesvia long-formquestionanswering. InProceedingsofthe
zero-shotparaphrasing. InProceedingsofEmpirical AssociationforComputationalLinguistics.
MethodsinNaturalLanguageProcessing.
|     |     |     |     |     |     | Seonghyeon | Ye, | Doyoung | Kim, | Sungdong | Kim, |
| --- | --- | --- | --- | --- | --- | ---------- | --- | ------- | ---- | -------- | ---- |
James Thorne, Andreas Vlachos, Christos Hyeonbin Hwang, Seungone Kim, Yongrae Jo,
Christodoulopoulos, and Arpit Mittal. 2018. James Thorne, Juho Kim, and Minjoon Seo. 2023.
FEVER:alarge-scaledatasetforfactextractionand Flask: Fine-grained language model evaluation
VERification. InConferenceoftheNorthAmerican based on alignment skill sets. arXiv preprint
| Chapter | of the | Association |     | for | Computational | arXiv:2307.10928. |     |     |     |     |     |
| ------- | ------ | ----------- | --- | --- | ------------- | ----------------- | --- | --- | --- | --- | --- |
Linguistics.
XiangYue,BoshiWang,KaiZhang,ZiruChen,YuSu,
HugoTouvron,ThibautLavril,GautierIzacard,Xavier and Huan Sun. 2023. Automatic evaluation of at-
Martinet,Marie-AnneLachaux,TimothéeLacroix, tributionbylargelanguagemodels. arXivpreprint
| Baptiste | Rozière, | Naman | Goyal, |     | Eric Hambro, | arXiv:2305.06311. |     |     |     |     |     |
| -------- | -------- | ----- | ------ | --- | ------------ | ----------------- | --- | --- | --- | --- | --- |

| ShiyueZhangandMohitBansal.2021. |     | Findingabal- |     |
| ------------------------------- | --- | ------------ | --- |
anceddegreeofautomationforsummaryevaluation.
InProceedingsofEmpiricalMethodsinNaturalLan-
guageProcessing.
| Tianyi Zhang,                 | Varsha Kishore, | Felix Wu, Kilian | Q.    |
| ----------------------------- | --------------- | ---------------- | ----- |
| Weinberger,andYoavArtzi.2020. |                 | Bertscore:       | Eval- |
| uatingtextgenerationwithbert. |                 | InProceedingsof  |       |
theInternationalConferenceonLearningRepresen-
tations.

A DetailsinDataCollection
Prompt:TellmeabioofYlonaGarcia.
Sentence:[YlonaGarcia]hassinceappearedinvariousTVshows
A.1 Samplinghumanentities suchasASAP(All-StarSundayAfternoonParty),Wansapanataym
Presents:AnnikaPINTAseraandMaalaalaMoKaya.
•YlonaGarciahasappearedinvariousTVshows.Supported
Wesample183humanentitiestobeannotatedas
•ShehasappearedinASAP.Supported
| follows. | We  | first choose | entities |     | from Wikidata |     |     |     |     |     |     |
| -------- | --- | ------------ | -------- | --- | ------------- | --- | --- | --- | --- | --- | --- |
•ASAPstandsforAll-StarSundayAfternoonParty.Supported
•ASAPisaTVshow.Supported
| whoseinstance |     | ofishumanandhavecorrespond- |     |     |     |     |     |     |     |     |     |
| ------------- | --- | --------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
•ShehasappearedinWansapanataymPresents:AnnikaPINTAsera.
| ingWikipediapages. |     |     | Wethencategorizeentities |     |     |     | Not-supported |     |     |     |     |
| ------------------ | --- | --- | ------------------------ | --- | --- | --- | ------------- | --- | --- | --- | --- |
based on two dimensions: frequency and nation- • Wansapanataym Presents: Annika PINTAsera is a TV show.
Irrelevant
ality, resulting in 20 categories. We then sample •ShehasappearedinMaalaalaMoKaya.Not-supported
•MaalaalaMoKayaisaTVshow.Irrelevant
entitiesuniformlyatrandomoverallcategories.
Prompt:TellmeabioofJohnEstes.
Frequency. We compute freqValue as a max- Sentence:WilliamEstesisanAmericanactorknownforhisroleon
imum of the entity occurrence in Wikipedia pro- CBSpolicedramaBlueBloodsasJamesonJ¨amieR¨eagan.
•WilliamEstesisanAmerican.Irrelevant
vided by Kandpal et al. (2022) and the pageview •WilliamEstesisanactor.Irrelevant
•WilliamEstesisknownforhisroleonCBSpolicedramaBlue
| count of | the | Wikipedia | page | following |     | Mallen |     |     |     |     |     |
| -------- | --- | --------- | ---- | --------- | --- | ------ | --- | --- | --- | --- | --- |
Bloods.Irrelevant
et al. (2023). We found using one of them •WilliamEstes’roleonBlueBloodsisJameson“Jamie”Reagan.
| could lead | to         | an underestimate |        | of      | frequency   | lev- | Irrelevant |          |              |            |     |
| ---------- | ---------- | ---------------- | ------ | ------- | ----------- | ---- | ---------- | -------- | ------------ | ---------- | --- |
| els due    | to failure | in               | entity | linking | or mismatch |      |            |          |              |            |     |
|            |            |                  |        |         |             |      | Table 7:   | Examples | that contain | Supported, |     |
in the Wikipedia page title, and taking a maxi- Not-supported and Irrelevant. Sentences in
| mumofthemprovidesareasonablesolution. |     |     |     |     |     | We  |     |     |     |     |     |
| ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
bulletpointsindicateatomicfacts.
| then assign | one | of five | categories: |     | ‘Very | rare’ |     |     |     |     |     |
| ----------- | --- | ------- | ----------- | --- | ----- | ----- | --- | --- | --- | --- | --- |
[0,102),
| if freqValue∈ |     |     | ‘Rare’ |     | if freqValue∈ |     |     |     |     |     |     |
| ------------- | --- | --- | ------ | --- | ------------- | --- | --- | --- | --- | --- | --- |
[102,103), freqValue∈ [103,104), foroneprompt,becausewefinditsavesannotation
|     | ‘Medium’ |     | if  |     |     |     |     |     |     |     |     |
| --- | -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
‘Frequent’ if freqValue∈ [104,105), and ‘Very time in total. 10% of the HITs have two workers
frequent’iffreqValue∈ [105,). assigned to calculate the agreement rate; the rest
|              |     |               |     |     |             |     | haveoneworkerassigned. |     | Theagreementratesare |     |     |
| ------------ | --- | ------------- | --- | --- | ----------- | --- | ---------------------- | --- | -------------------- | --- | --- |
| Nationality. |     | Wetakecountry |     | of  | citizenship |     |                        |     |                      |     |     |
96%,90%and88%forInstructGPT,ChatGPTand
| from Wikidata |        | and assign | them | one     | of four | cat-   |                                |     |                      |                 |     |
| ------------- | ------ | ---------- | ---- | ------- | ------- | ------ | ------------------------------ | --- | -------------------- | --------------- | --- |
|               |        |            |      |         |         |        | PerplexityAI,respectively.     |     | AppendixA.5discusses |                 |     |
| egories:      | ‘North | America’,  |      | ‘Europe | &       | Middle |                                |     |                      |                 |     |
|               |        |            |      |         |         |        | disagreementcasesinmoredetail. |     |                      | Thefullinstruc- |     |
East’,‘Asia&Pacific’and‘Latin/SouthAmerica
tionsandtheinterfaceareprovidedinFigure6and
&Africa’.
Figure7,respectively.
A.2 Detailsingeneratingatomicfacts
|     |     |     |     |     |     |     | A.4 Examplesinannotateddata |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --------------------------- | --- | --- | --- | --- |
Webreakoutagenerationautomaticallybysplit-
tingagenerationintosentences,andfeedingeach Table7providesexamplesofthehuman-annotated
sentence to InstructGPT (text-davinci-003) data, each atomic fact with an assigned label.
withaseriesofinstructionstofurtherbreakitdown Supported and Not-supported respectively in-
toaseriesofatomicfacts. TheprompttoInstruct- dicate Wikipedia supports the fact and does not
| GPT is | provided | in Table | 15. | Outputs | from | In- |         |                  |             |     |          |
| ------ | -------- | -------- | --- | ------- | ---- | --- | ------- | ---------------- | ----------- | --- | -------- |
|        |          |          |     |         |      |     | support | the fact (either | contradicts | or  | does not |
structGPTareused(1)tohumanexpertsforrevi- containanyevidence). Irrelevantindicatesthe
sion(Section3.3)and(2)formodel-basedevalua- fact is irrelevant to the input prompt, which can
tors(Section4). Wefindhumanexpertssplitand further be divided into two cases: (1) the fact
mergedatomicfactsfromInstructGPTfor18%and depends on other facts because it expands previ-
34%ofthecases,respectively. ousfactsinageneration,andsuchotherfactsare
|     |     |     |     |     |     |     | Not-supported, | e.g., | in the first | example | in Ta- |
| --- | --- | --- | --- | --- | --- | --- | -------------- | ----- | ------------ | ------- | ------ |
A.3 Moredetailsonannotatorrecruitment
|     |     |     |     |     |     |     | ble 7, and | (2) the entire | sentence | is irrelevant | to  |
| --- | --- | --- | --- | --- | --- | --- | ---------- | -------------- | -------- | ------------- | --- |
We recruit freelancers through Upwork and pay theprompt,independentfromotherfactsinagen-
15–25 USD per hour. We recruit fact-checking eration, e.g., thesecondexampleinTable7. The
experts—freelancerswhomentionedfact-checking secondcaserarelyhappenswithInstructGPTand
astheirexpertise—forStep3. Everyworkerwent ChatGPT,buthappensconsiderablywithPerplex-
through a qualification test of 2 hours and was ityAI, i.e., 24.7% of generations of PerplexityAI
testedtobehighlyqualified. WedesignoneHITto have≥sentencesmarkedasirrelevantwithoutde-
consistofthreegenerations,onefromeachLM , pendencies to other facts, compared to 0.5% and
SUBJ

| Category |     | % Example |     |     |     |     |     |
| -------- | --- | --------- | --- | --- | --- | --- | --- |
Different interpretations of 21 GenGerhardFischerisaninventor. WikiGerhardFischer(inventor). ... wasfirstpatentedbyDr.
thefactualinformation GerhardFischerin1931. Ametaldetectorhadbeeninventedsomefortyyearsearlier(1881)by
AlexanderGrahamBell...
GenChadwickBosemanwasaproducer.CommentChadwickBosemanisnotknownasaproducer,but
producedonemusicvideo.
Inferred (not directly men- 16 GenLeachhassincebecomeamemberoftheEnglandTestteam.CommentLeachisamemberofthe
| tionedbuthighlylikely) |     | EnglandTestteam,butsincewhenislessclear. |     |     |     |     |     |
| ---------------------- | --- | ---------------------------------------- | --- | --- | --- | --- | --- |
Dependsonhowstrictinjudg- 11 GenHemadehisTestdebutforEnglandinMarch2018.WikiOn16March2018,hewascalledupto
ingthecorrectness England’sTestsquad(...)HemadehisdebutinthesecondTestinChristchurch.
|     |     | GenThebuildingwasthefirstLEED-certificatedbuildinginEdmonton. |     |     |     | Wiki(..) | becamethefirst |
| --- | --- | ------------------------------------------------------------- | --- | --- | --- | -------- | -------------- |
projectintheCityofEdmontontoachieveaLEEDGoldstatus.
Subjective 21 GenChadwickBosemanbecameanAfricanAmericanpioneer.WikiCulturewriterSteveRose,inThe
Guardian,saidthatBoseman’scareerwasrevolutionaryandhe“leavesbehindagamechanginglegacy”
(...)Rosewrote:“ChadwickBosemanbeganhiscareerplayingAfricanAmericaniconsandpioneers;
heendsitasonehimself.”
Wikipedianotconsistent 5 Gen [Tim Fischer] was an Ambassador to the Holy See from 2009 to 2012. Wiki ... was later
|     |     | Ambassador | to the Holy See | from 2009 to 2012. | (...) Australian | Ambassador | to the Holy See |
| --- | --- | ---------- | --------------- | ------------------ | ---------------- | ---------- | --------------- |
2008–2012CommentTheplaintextandthetableoftheTimFischerpageaswellastheAustralian
AmbassadortotheHolySeepageareinconsistentinhisstartyear.
| Twodifferententities |     | 5 CommentCarlosJ.Alfonsovs.CarlosAlfonso |     |     |     |     |     |
| -------------------- | --- | ---------------------------------------- | --- | --- | --- | --- | --- |
Mistakesinannotation 21 GenJackLeachisaleft-handedbatsman.CommentmentionedintheEnglandcricketteampage,Table
CurrentSquad.
Table8: Categorizationofdisagreementcases. GenindicatesthegenerationfromPerplexityAI,andWikiindicates
| evidencetextfromWikipedia. |     | Commentindicatesourcomments. |     |     |     |     |     |
| -------------------------- | --- | ---------------------------- | --- | --- | --- | --- | --- |
1.3% in InstructGPT and ChatGPT, respectively. • Chadwick Boseman was a producer: Chad-
ThisisbecausePerplexityAIoftendirectlycopies wickBosemaniswidelyknownasanotherpro-
searchresultseveniftheyarelargelyirrelevantto fession (singer) and there is no text that men-
theinputprompt. Thisisinagreementwithacon- tionshimasaproducer. However,heproduced
| current | work from Liu | et al. (2023a) | that shows | onemusicvideo. |     |     |     |
| ------- | ------------- | -------------- | ---------- | -------------- | --- | --- | --- |
generativesearchengineslikePerplexityAIcopy
Nonetheless,sinceouragreementrateisfairlyhigh
| incorrect | search results | and generate | text that is |     |     |     |     |
| --------- | -------------- | ------------ | ------------ | --- | --- | --- | --- |
(91%),wethinksuchcasesarerareinourparticular
irrelevanttotheinputquery.
|     |     |     |     | domain of | people biographies. | We  | include more |
| --- | --- | --- | --- | --------- | ------------------- | --- | ------------ |
discussiononotherdomainsthatsuchcasesmay
A.5 QualitativeAnalysis
bemorefrequentintheLimitationsection.
| Analysisofdisagreementcases. |                |          | Weanalyzethe |                             |     |     |              |
| ---------------------------- | -------------- | -------- | ------------ | --------------------------- | --- | --- | ------------ |
|                              |                |          |              | CoverageofEnglishWikipedia. |     |     | Whilefactual |
| cases where                  | two annotators | assigned | to a same    |                             |     |     |              |
predictionisinherentlyafunctionofaknowledge
| generation | disagree | on a precision | label for the |     |     |     |     |
| ---------- | -------- | -------------- | ------------- | --- | --- | --- | --- |
same atomic fact. Categorization is provided in source given as part of the input, a potential con-
Table8. The70%isduetoaninherentdebatability cernishowrepresentativeusingEnglishWikipedia
asaknowledgesourceforevaluatingpeoplebiogra-
onwhetherornotthefactissupportedbyagiven
sourceofknowledge,notsatisfyingAssumption2 phieswithrespecttoitscoverage. Forinstance,itis
inSection3.1. Thisisbecausetherecanbemultiple possiblethat,especiallyforrareentities,thecover-
ageofinformationinWikipediaisnothighenough,
interpretationsofafact,itisdebatablewhetheror
andLMsmaybepenalizedbygeneratinginforma-
notaninformationcanbeinferredfromapieceof
text,ortheatomicfactissubjective. Forinstance: tionthatistrueevenifnotsupportedbyWikipedia
(i.e.,supportedbyothersourcesontheweb).
• Gerhard Fischer is an inventor: Ger- Toquantifytheeffect,werandomlysample30
hard Fischer is widely known as an inventor unsupportedfactsfromChatGPTonpeoplewhose
of a metal detector, and even the title of the categoriesareeither‘rare’or‘veryrare’,andthen
Wikipedia article is “Gerhard Fischer (inven- validatethemagainsttheentireweb. Wefound10%
tor)”. However,itlaterturnsoutthathedidnot (3outof30facts)areinfactsupported,eventhough
inventametaldetector;rather,hecommercial- theyarenotsupportedinWikipedia. Anexampleis
| izedit. |     |     |     | [Hibo]Warderepublishedhermemoirtitled“Cut: |     |     |     |
| ------- | --- | --- | --- | ------------------------------------------ | --- | --- | --- |

Supported Not-Supported
Ground truth Ground truth = 80%
Estimated = 90%
Evaluator A AccuracyMICRO= 90%
Error Rate = 10%
Estimated =75%
Evaluator B AccuracyMICRO = 85%
Error Rate = 5%
OneWoman’sFSuigphptoArtgedainstFNGotM-SuinppBorritteadinToday” Supported Not-Supported
whichisnotmentionedinWikipediabutisfound
Ground truth
Ground truth
fromGoogleBooks. 75%
80%
Nonetheless,wefoundthatWikipediahasahigh
Evaluator A
coverage and mentions most of the important in-
Evaluator A Estimated = 85%
formationthatwewereabletofindfromanyother
Estimated = 90% F1MICRO= 75% ER = 10%
sourcesontheweb. Thisisinagreementwithprior
AccuracyMICRO= 67% ER = 10%
workthattreatedWikipediaasageneralknowledge Evaluator B
Estimated = 80%
sourEcvealuunatdoer rBt he same reason (Chen et al., 2017;
EPsetitmroanteide t= a75l.%,2021).
F1MICRO = 67% ER = 5%
AccuracyMICRO = 57% ER = 5% Figure4: AcaseinwhichF1 andErrorRate(ER)
MICRO
B DetailsinEstimators ranktwoevaluatorsdifferently. EvaluatorAisbetterin
F1 ,andEvaluatorBisbetterinER.
MICRO
B.1 Implementationdetails
As an LM , we use the best open LM and the B.2 Segment-levelvs. system-levelevaluation
EVAL
bestcommercialLMatthetimeofconductingex-
Besides how close the estimated FACTSCORE is
periments: LLAMA65B(Touvronetal.,2023)and
tothegroundtruthFACTSCORE(ErrorRate,as
LLAMA7BtrainedonSuperNaturalInstructions
reported in Section 4), we also report F1 .
MICRO
(Inst-LLAMA, Wang et al., 2022) as the former,
F1 evaluates how well the model validates
MICRO
and ChatGPT (OpenAI, 2022) as the latter. For
each individual atomic fact, assuming oracle
computing nonparametric probabilities, we use a
atomic facts (atomic facts by human experts) are
single-maskvariantofNPMwithBM25asinthe
given,andevaluateshowgoodtheestimatorisin
originalpaper(Minetal.,2023),anduse0.3asa
identifyingfactsthatarenotSupported(NS).For-
thresholdinghyperparameter.
mally,letG andP besetsofatomicfactsinasetof
Forpassageretrieval,weuseGeneralizableT5- generationsthathaveNot-supportedasaground
based Retrievers (GTR, a large variant), an unsu- truth label and as a predicted label, respectively.
perviseddensepassageretrievalsystem(Nietal., WedefineF1 asfollows.
MICRO
2022). We restrict retrieved passages to be from
thetopicentity’spage,andusek = 5. Wefindour P ∩G P ∩G 2·P·R
P = , R = , F1 =
estimatorisnotsensitivetothechoiceofaretrieval P G MICRO P+R
system(ablationsprovidedinAppendixB.3). As
WecallthemMICRObecausetheyconsiderindivid-
a retrieval corpus, we use the English Wikipedia
ualdecisionsratherthanaggregatedestimation.
from04/01/2023whichisaroundthetimethedata
annotationwascompleted,andspliteachpageinto ER vs. F1 . F1 cares about the indi-
MICRO MICRO
passageswithupto256tokens.
vidual decision, while ER cares about the aggre-
gatedestimation. Anevaluatorthathasahigh(bet-
Additional baselines. We also compare with
ter)F1 butalwaysoverestimatesorunderesti-
MICRO
Self-checkLM,amethodfromaconcurrentwork
matesfactualprecisionmayhaveahigher(worse)
by Manakul et al. (2023). Self-check LM needs
ER,e.g.,EvaluatorAinFigure4. Conversely,an
multiplesamplesgeneratedfromtheLM . Itval-
SUBJ evaluator that has a lower (worse) F1 but is
MICRO
idatesthegivenatomicfactbypromptingLM
EVAL notbiasedtowardoverestimationnorunderestima-
conditioningoneachgeneratedsample,17 making
tionmayhavealower(better)ER,e.g.,Evaluator
judgment (Supported or not) from each, and ag-
BinFigure4. Priorworkinmodel-basedevalua-
gregatestheresultsthroughamajorityvote. This
tionmainlyreportsaggregatedscoressincethegoal
methodassumes(1)theLM isavailableatthe
SUBJ is a comparison between different systems being
time of evaluation and (2) the outputs from the
evaluated(Zhangetal.,2020;Rashkinetal.,2021;
LM arenondeterministic,whichmakesitnot
SUBJ Gao et al., 2022) while we report both to see the
applicabletoPerplexityAI.
relationshipbetweentwotypesofmetrics. F1
MICRO
and ER are also closely related to segment-level
17Manakuletal.(2023)usesBERTScoreandasupervised
andsystem-levelcorrelationstohumanjudgments
questionansweringsysteminsteadofLMprompting,however,
wefindLMpromptingtobesignificantlybetter. respectively,whichhavebeenextensivelyusedin

LM LM
Evaluator retrv SUBJ Evaluator retrv SUBJ
InstGPTChatGPT PPLAI InstGPTChatGPT PPLAI
AlwaysSupported - 0.0 0.0 0.0 LLAMA65B
AlwaysNot-supported - 71.4 58.3 30.9 No-contextLM ✗ 22.2 20.0 18.6
Random - 52.2 45.0 25.7 Retrieve→LM ✓ 54.6 42.1 36.1
Retrieve→LM+NP ✓ 80.1 67.1 55.1
No-contextLM ✗ 61.2 52.2 31.4
Self-checkLM ✗ 66.0 48.4 - Inst-LLAMA7B
No-contextLM ✗ 61.2 52.2 31.4
Retrieve→LM ✓ 78.7 61.9 51.1 Retrieve→LM ✓ 78.7 61.9 51.1
NP ✓ 70.0 56.6 51.4 Retrieve→LM+NP ✓ 83.2 70.5 53.3
Retrieve→LM+NP ✓ 83.2 70.5 53.3
ChatGPT
No-contextLM ✗ 40.0 25.4 25.4
Table9: ResultsinF1 usingInst-LLAMA7Bas
MICRO Retrieve→LM ✓ 87.5 80.2 65.8
an LM EVAL . ‘retrv’ indicates whether or not retrieval Retrieve→LM+NP ✓ 86.6 77.8 60.8
is used. Self-check is not applicable to PerplexityAI
whoseoutputsaresemi-deterministic. Boldindicates Table10:AblationinF1 onthechoicesofLM .
MICRO EVAL
thebestperformance. ‘retrv’indicateswhetherornotretrievalisused. Bold
andRedboldindicatethebestF1withinopen-access
LMsandcommercialLMs,respectively.
developingevaluationmetricsinmachinetransla-
tion (Ma et al., 2019; Thompson and Post, 2020)
andsummarization(Bhandarietal.,2020;Deutsch different choices of an LM . Within the same
EVAL
etal.,2021). method, Inst-LLAMA 7B outperforms LLAMA
65B, and ChatGPT outperforms both. Using re-
Results. Results on F1 are reported in Ta-
MICRO trieval is critical across all models, e.g., the best
ble9. Self-checkLMoutperformsno-contextLM
no-contextmodelbasedonChatGPTisunderper-
by4–11%,whichconfirmsfindingsfromManakul
formed by all models with retrieval. Using NP
etal.(2023). However,bothsignificantlyunderper-
helps LLAMA-based models but not ChatGPT,
formmethodsthatuseretrieval. Thisisincontrast
likelybecauseChatGPTislessaffectedbyincor-
toManakuletal.(2023)thatreportsthatSelf-check
rectpriorfromtheLMordistractingpassages.
withoutretrievalachievesperformancethatisclose
Itisworthnotingthattheseresultsaresomewhat
to that with retrieval, likely because the data in
differentfromfindingsinSection4.2thatChatGPT
Manakuletal.(2023)containsmorefrequenten-
isnotnecessarilybetterthanLLAMA+NP.Thisis
tities. Thefactthatretrievalsignificantlyhelpsis
becauase, although ChatGPT is better in validat-
consistentwithfindingsinSection4.2withanER
ingeachindividualatomicfact,mosterrorsfrom
asametric.
ChatGPTareincorrectlyassigningSupportedto
Adding NP improves Retrieve→LM by 2–9%,
Not-supported facts, resulting in an overestima-
againconsistentwithfindingsinSection4.2. This
tion of FACTSCORE. In contrast, LLAMA+NP
islikelybecauseRetrieve→LMoftenmakesincor-
is not biased toward overestimation or underes-
rectpredictionswhenthereisastrongbiasfroman
timation of the factual precision, resulting in an
LMortherearedistractingpassages,andconsider-
aggregated factual precision to be closer to the
ingnonparametricprobabilitiesmakesthemodel
ground truth. This is similar to the trade-off be-
morerobusttothesefactors. Forinstance,givenan
tweensystem-levelandsegment-levelcorrelations
unsupportedfactSamuel Oboh is Nigerian,No-
insummarizationevaluation(Bhandarietal.,2020;
contextLM,Self-checkLMandRetrieve→LMpre-
Deutschetal.,2021).
dict Supported due to a strong name-nationality
bias. NPM correctly predicts Not-supported
B.3 Ablations
based on a passage Samuel Oboh ... is a
QAPromptingvs. TFPrompting Asdescribed
Canadian architect, manager, .... Itisalso
in Section4.1, we useTrue or False as partof
worthnotingthatthisisdifferentfromfindingsin
the prompt, so-called TF Prompting. An alterna-
Section4.2thatChatGPTisnotnecessarilybetter
tive is QA Prompting, which generates a question
thanLLAMA+NPbasedonER.
and the expected answer, obtains the answer for
UsingastrongerLM significantlyimproves the generated question independent from the ex-
EVAL
F1 . Table 10 reports a comparison across pectedanswer,andcomparestheexpectedanswer
MICRO

LM Category %
Evaluator SUBJ
InstGPT ChatGPT PPLAI Nodirectevidencefromretrievedpassages 70
Distractedbyotherpassages 17
AlwaysSupported 30.8 37.1 45.0
Atomicfactiscontext-dependent 7
AlwaysNot-supported 35.7 29.1 15.5
Wrongpredictionevenwiththerightpassage 3
Random 50.5 50.2 43.2
Annotationerror 3
QAPrompting
No-contextLM 56.5 48.8 32.5 Table13: Categorizationof30samplesincorrectlypre-
Self-checkLM 65.3 63.2 -
dictedbyRetrieve→LMbasedonChatGPT.
Retrieve→LM 65.3 58.2 47.3
TFPrompting
No-contextLM 57.3 55.3 41.7 catethatallretrievalsystemsareequallygoodand
Self-checkLM 68.0 61.9 -
Retrieve→LMisnotsensitivetothechoiceofthe
Retrieve→LM 78.9 71.4 69.2
retrievalsystem.
Table11:ResultsonF1 ,comparingbetweentheQA
MICRO Qualitativeanalysis. Table13categorieserrors
promptingandTFPrompting. WeuseInst-LLAMA7B
made by Retrieve→LM based on ChatGPT, the
asanLM . Self-checkisnotapplicabletoPerplex-
EVAL
evaluatorwiththebestF1 . 70%oftheerrors
ityAIsincePerplexityAIoutputsaresemi-deterministic. MICRO
BoldindicatesthebestF1 . areduetoretrievedpassagesnotprovidingdirect
MICRO
evidence(eithersupportorcontradiction). These
LM aredifficultevenforstate-of-the-artretrievalsys-
Retrieval SUBJ
temsandlanguagemodelsbecausevalidatingfacts
InstGPT ChatGPT PPLAI
often requires reading the entire page rather than
BM25 78.5 70.8 69.1
GTRLarge 78.9 71.4 69.2 asinglepassage,e.g.,anactornotappearingina
GTRxLarge 79.2 71.3 69.0 particular film. 17% of errors are made because
ChatGPTisbeingdistractedbyotherpassages,al-
Table12: ResultsonF1 , comparingdifferentre-
MICRO thoughitassignsacorrectlabelifonlyaparticular,
trievalsystems: BM25,GTRLargeandGTRxLarge,
correctpassageisgiven.
allwithRetrieve→LMbasedonInst-LLAMA7B.Bold
indicatesthebestF1 .
MICRO B.4 MoredetailsinevaluationofnewLMs
(Section4.3)
andthepredictedanswer. Thisapproachhasbeen
Variance in estimation. Figure 5 reports
widelystudiedinthesummarizationliteratureand
FACTSCOREs estimated by two variants of our
recentworkinfactualprecision(Kryscinskietal.,
estimatorasinFigure3butwith100randomsub-
2020;Wangetal.,2020;Gaoetal.,2022;Manakul
setsofthedata. Specifically,wechoseN samples
etal.,2023). Table11providesacomparisonbe-
(out of 500) uniformly at random across 20 cat-
tween two types of prompting. The TF approach
egories (defined in Appendix A.1) M times and
significantlyoutperformstheQAapproach,consis-
reporttheaverageandthestandarddeviation. We
tentlyoverallmethods. Ourfurtheranalysisfinds
use N = {40,100,200} and M = 100. Results
thatthisisduetogeneratedquestionsoftenbeing
indicatethatthevarianceisoveralllow,preserving
overlyvagueorambiguous. Forinstance,givena
rankingbetween13subjectsinmostcases. Asex-
supported fact Samuel Oboh is an architect,
pected,thevarianceislowerasthesamplesizegets
theLMgeneratesWhat is Samuel Oboh’s job?
larger. Finally,theestimatorbasedonERbasedon
as a question and Architect as an expected an-
LLAMA+NP (bottom) has an overall lower vari-
swer,andtheobtainedanswerisVice President.
ancethantheestimatorbasedonChatGPT(top).
Although both Architect and Vice President
arecorrect,theyarenotthesame,thusthemodel B.5 Feasibilityinapplying FACTSCOREto
incorrectly predicts Not-supported. Such cases otherdomains
makethemodeloverpredictNot-supported,lead-
As mentioned in the Limitation section, our pa-
ingtomanyincorrectpredictions.
per mainly evaluates on people biographies us-
Impactofthechoiceofretrieval. Table12com- ingWikipedia. Evaluatingthegeneralizabilityof
paresRetrieve→LMmethodsbasedonafewpas- FACTSCORE toothertypesofpromptsandother
sageretrievalsystems,includingBM25(Linetal., domainsisanavenueforfuturework.
2021),GTRLargeandGTRxLarge. Resultsindi- As a proof of conept, we conduct small-scale

40 samples (2 per category) 100 samples (5 per category) 200 samples (10 per category)
|                  | Human       |                    |     |                  | Human       |      |                    |     |                  | Human       |      |                    |     |
| ---------------- | ----------- | ------------------ | --- | ---------------- | ----------- | ---- | ------------------ | --- | ---------------- | ----------- | ---- | ------------------ | --- |
|                  | GPT4        |                    |     |                  |             | GPT4 |                    |     |                  |             | GPT4 |                    |     |
|                  | ChatGPT     |                    |     |                  | ChatGPT     |      |                    |     |                  | ChatGPT     |      |                    |     |
|                  | Alpaca 65B  |                    |     |                  | Alpaca 65B  |      |                    |     |                  | Alpaca 65B  |      |                    |     |
|                  | InstructGPT |                    |     |                  | InstructGPT |      |                    |     |                  | InstructGPT |      |                    |     |
|                  | Alpaca 13B  |                    |     |                  | Alpaca 13B  |      |                    |     |                  | Alpaca 13B  |      |                    |     |
|                  | Vicuna 13B  |                    |     |                  | Vicuna 13B  |      |                    |     |                  | Vicuna 13B  |      |                    |     |
|                  | Vicuna 7B   |                    |     |                  | Alpaca 7B   |      |                    |     |                  | Alpaca 7B   |      |                    |     |
|                  | Alpaca 7B   |                    |     |                  | Vicuna 7B   |      |                    |     |                  | Vicuna 7B   |      |                    |     |
|                  | MPT-Chat 7B |                    |     |                  | MPT-Chat 7B |      |                    |     |                  | MPT-Chat 7B |      |                    |     |
| Oasst-pythia 12B |             |                    |     | Oasst-pythia 12B |             |      |                    |     | Oasst-pythia 12B |             |      |                    |     |
|                  | Dolly 12B   |                    |     |                  | Dolly 12B   |      |                    |     |                  | Dolly 12B   |      |                    |     |
|                  | StableLM 7B |                    |     |                  | StableLM 7B |      |                    |     |                  | StableLM 7B |      |                    |     |
|                  | 0           | 50                 |     | 100              |             | 0    | 50                 |     | 100              |             | 0    | 50                 | 100 |
|                  |             | Est. FActScore (%) |     |                  |             |      | Est. FActScore (%) |     |                  |             |      | Est. FActScore (%) |     |
40 samples (2 per category) 100 samples (5 per category) 200 samples (10 per category)
|                  | Human       |                    |     |                  | Human       |      |                    |     |                  | Human       |      |                    |     |
| ---------------- | ----------- | ------------------ | --- | ---------------- | ----------- | ---- | ------------------ | --- | ---------------- | ----------- | ---- | ------------------ | --- |
|                  | ChatGPT     |                    |     |                  | ChatGPT     |      |                    |     |                  | ChatGPT     |      |                    |     |
|                  | GPT4        |                    |     |                  |             | GPT4 |                    |     |                  |             | GPT4 |                    |     |
|                  | Alpaca 65B  |                    |     |                  | Alpaca 65B  |      |                    |     |                  | Alpaca 65B  |      |                    |     |
|                  | InstructGPT |                    |     |                  | InstructGPT |      |                    |     |                  | InstructGPT |      |                    |     |
|                  | Vicuna 13B  |                    |     |                  | Vicuna 13B  |      |                    |     |                  | Vicuna 13B  |      |                    |     |
|                  | Alpaca 13B  |                    |     |                  | Alpaca 13B  |      |                    |     |                  | Alpaca 13B  |      |                    |     |
|                  | Vicuna 7B   |                    |     |                  | Vicuna 7B   |      |                    |     |                  | Vicuna 7B   |      |                    |     |
|                  | Alpaca 7B   |                    |     |                  | Alpaca 7B   |      |                    |     |                  | Alpaca 7B   |      |                    |     |
|                  | MPT-Chat 7B |                    |     |                  | MPT-Chat 7B |      |                    |     |                  | MPT-Chat 7B |      |                    |     |
| Oasst-pythia 12B |             |                    |     | Oasst-pythia 12B |             |      |                    |     | Oasst-pythia 12B |             |      |                    |     |
|                  | Dolly 12B   |                    |     |                  | Dolly 12B   |      |                    |     |                  | Dolly 12B   |      |                    |     |
|                  | StableLM 7B |                    |     |                  | StableLM 7B |      |                    |     |                  | StableLM 7B |      |                    |     |
|                  | 0           | 25 50              | 75  |                  |             | 0    | 25 50              | 75  |                  |             | 0    | 25 50              | 75  |
|                  |             | Est. FActScore (%) |     |                  |             |      | Est. FActScore (%) |     |                  |             |      | Est. FActScore (%) |     |
Figure5: Impactofdifferentsubsetsofrandomsamplesinprompts. TheFACTSCOREsto13subjects(humanand
12LMs)areratedbythetwobestvariantsofourestimator: ChatGPT(Top)andLLAMA+NP(Bottom),bothwith
retrieval. Thevarianceisoveralllow,andislowerasthesamplesizegetslargerandwithLLAMA+NP(bottom)
thanwithChatGPT(top).
studiesintheNLPdomain. Wefirstmanuallywrite preliminary exploration of methods to edit long-
10 prompts asking about NLP papers: Tell me a form LM generations to reflect factually correct
summary of <paper-title>, and then obtain re- information. We assume we have access to the
sponsesfromChatGPT.Next,werunFACTSCORE human-annotated set of FACTSCORE labels, and
againstanACLanthologyasaknowledgesource. measurehowgoodmodelsareateditingincorrect
Finally, wecomputeanerrorrate(ER)—adiffer- sentences. Inotherwords,weevaluateoureditor
ence between humans’ validation (labeled by au- modelsindependentoftheerrorsarisingfromthe
| thors)andthemodel’svalidation—aswedoinSec- |     |     |     |     |     |     | estimator. |     |     |     |     |     |     |
| ------------------------------------------ | --- | --- | --- | --- | --- | --- | ---------- | --- | --- | --- | --- | --- | --- |
tion4. TheERis7.41(FACTSCOREfromhumans
| being66.20,and |               | FACTSCORE     |     | fromthemodelbe- |           |     | C.1      | Methods |         |     |            |            |     |
| -------------- | ------------- | ------------- | --- | --------------- | --------- | --- | -------- | ------- | ------- | --- | ---------- | ---------- | --- |
| ing            | 73.61), which | is comparable |     | to              | ER values | in  |          |         |         |     |            |            |     |
|                |               |               |     |                 |           |     | We adopt | a       | similar | set | of methods | as Section | 4.1 |
peoplebiosshowninTable3.
|     |                  |           |     |               |     |     | foroureditingmodels. |     |     |     | Allmethodsbelowusefour |     |     |
| --- | ---------------- | --------- | --- | ------------- | --- | --- | -------------------- | --- | --- | --- | ---------------------- | --- | --- |
|     | Thissuggeststhat | FACTSCORE |     | cangeneralize |     |     |                      |     |     |     |                        |     |     |
exemplarexamplesforin-contextlearningwhich
| beyondpeoplebiographies. |     |     | However,sincethisis |     |     |     |      |         |      |     |         |             |     |
| ------------------------ | --- | --- | ------------------- | --- | --- | --- | ---- | ------- | ---- | --- | ------- | ----------- | --- |
|                          |     |     |                     |     |     |     | were | sampled | from | our | dataset | and removed | for |
averysmall-scaleexperiment,westronglyencour- subsequentanalysis. Forallmethods,weuseOpe-
agefutureresearchtoexplorethegeneralizability
|     |     |     |     |     |     |     | nAI’s | ChatGPT |     | (OpenAI, | 2022) | as the | base lan- |
| --- | --- | --- | --- | --- | --- | --- | ----- | ------- | --- | -------- | ----- | ------ | --------- |
of FACTSCOREtomoredomainsatscale.
guagemodelduetoitsgenerativecapabilities.
|     |     |     |     |     |     |     | No-context |     | LM. | We  | feed | language models | the |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --- | --- | --- | ---- | --------------- | --- |
C EditingExperiments
|     |     |     |     |     |     |     | promptInput: |     |     | <sentence> |     | Edit: andaskitto |     |
| --- | --- | --- | --- | --- | --- | --- | ------------ | --- | --- | ---------- | --- | ---------------- | --- |
editthetext,withoutanyretrievedcontext.
OurexperimentsinSection4focusesonautomat-
icallyidentifyingfactualprecisionerrorsinlong- Retrv→LM. To assist an editor model, we use
formgenerationsbylanguagemodels. Canthese a passage retrieval system to find supporting
labelsbeusedtoactuallycorrecterrorsinthelong- evidence from an external knowledge source
form generations? In this section, we perform a (Wikipedia in our case). Our retrieval pipeline is

identicaltoAppendixB.1,butuses3retrievedpas- where || · || is the set cardinality and HM de-
sagesinsteadof5duetocontextlengthrestrictions. notesaharmonicmean. Forthismetric,wediscard
|               |     |     |                               |     |     |     | data points | where | the | gold edit | did | not | add new |
| ------------- | --- | --- | ----------------------------- | --- | --- | --- | ----------- | ----- | --- | --------- | --- | --- | ------- |
| +AtomicFacts. |     |     | Additionally,weexplorewhether |     |     |     |             |       |     |           |     |     |         |
addingatomicfactsandtheirlabelsassistamodel tokens. Similar to ErrLoc, we also remove stop-
words,removepunctuationandlowercasestrings
| with | fine-grained |     | editing. | Specifically, |     | after the |     |     |     |     |     |     |     |
| ---- | ------------ | --- | -------- | ------------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- |
beforecalculatingEditCorrscores.
inputsentenceweaddinformationtothepromptof
| theformFact |     |     | 1 (True/False): |     | <atomic | fact |         |           |     |          |          |     |        |
| ----------- | --- | --- | --------------- | --- | ------- | ---- | ------- | --------- | --- | -------- | -------- | --- | ------ |
|             |     |     |                 |     |         |      | (3) SIM | alignment |     | (SimAl): | Finally, | due | to the |
1> Fact 2 (True/False): <atomic fact 2> largeoutputspaceofpossibleedits,wealsoadopta
... Thisdataisalsoprovidedintheexemplars. metricwhichrewardsparaphrasesofthegoldedits.
Non-edit baselines. Finally, we add some triv- WeusesemanticsimilarityembeddingsfromWiet-
ial baselines to lower-bound our editing metrics. ingetal.(2022)whichmapparaphrasestoasimi-
|     |     |     |     |     |     |     | larpartofavectorspace. |     |     | Wecheckthesimilarity |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------------------- | --- | --- | -------------------- | --- | --- | --- |
Specifically,wemeasuretheperformanceofinput
|         |     |             |     |         |           |           | betweenthemodeleditE |     |     | andthegoldeditG,nor- |     |     |     |
| ------- | --- | ----------- | --- | ------- | --------- | --------- | -------------------- | --- | --- | -------------------- | --- | --- | --- |
| copying |     | (no edits), | as  | well as | an editor | with ran- |                      |     |     |                      |     |     |     |
dom token dropping / replacement on a random malizing it by the similarity between G and the
|     |     |     |     |     |     |     | originalinputX.18 |     | Specifically, |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ----------------- | --- | ------------- | --- | --- | --- | --- |
25%subsetoftokens.
| C.2 | Evaluation |     |     |     |     |     |     |       | (cid:18) | s(G,E)−s(G,X) |     |     | (cid:19) |
| --- | ---------- | --- | --- | --- | --- | --- | --- | ----- | -------- | ------------- | --- | --- | -------- |
|     |            |     |     |     |     |     | Sim | = max | 0,       |               |     |     |          |
1−s(G,X)
Inourdatacollectionprocess(Section3.3),along
| with                       | our       | verification |     | data we     | also collected | gold-          |                 |                                   |        |                     |            |     |         |
| -------------------------- | --------- | ------------ | --- | ----------- | -------------- | -------------- | --------------- | --------------------------------- | ------ | ------------------- | ---------- | --- | ------- |
|                            |           |              |     |             |                |                | where           | s(A,B)                            | is     | thesemantic         | similarity |     | score   |
| standardhumanwrittenedits. |           |              |     |             | LetX           | = x ,...x      |                 |                                   |        |                     |            |     |         |
|                            |           |              |     |             |                | 1 NX           |                 |                                   |        |                     |            |     |         |
|                            |           |              |     |             |                |                | (normalized     | to                                | [0,1]) | from the            | model      | in  | Wieting |
| be                         | the input | sentence     |     | and G       | = g ,...g      | be the         |                 |                                   |        |                     |            |     |         |
|                            |           |              |     |             | 1              | NG             |                 |                                   |        |                     |            |     |         |
|                            |           |              |     |             |                |                | etal.(2022).    | Intuitively,thismetricmeasureshow |        |                     |            |     |         |
| gold                       | edited    | sentence.    |     | We evaluate |                | the quality of |                 |                                   |        |                     |            |     |         |
|                            |           |              |     |             |                |                | muchcloserGandE |                                   |        | arecomparedtoGandX. |            |     |         |
| themodel-generatededit(E   |           |              |     |             | = e 1 ,...,e   | NE )using      |                 |                                   |        |                     |            |     |         |
threeautomaticmetrics,
C.3 Results
| (1) | Error | Localization |     | (ErrLoc): |     | Our first met- |                                      |     |     |     |     |     |          |
| --- | ----- | ------------ | --- | --------- | --- | -------------- | ------------------------------------ | --- | --- | --- | --- | --- | -------- |
|     |       |              |     |           |     |                | WepresentoureditingresultsinTable14. |     |     |     |     |     | Overall, |
ricmeasureshowwelltheeditoridentifieserrors
wefindthat:
| withintheinputsentence. |          |              |     | Specifically,wefirstcre- |         |       |             |        |     |         |        |      |         |
| ----------------------- | -------- | ------------ | --- | ------------------------ | ------- | ----- | ----------- | ------ | --- | ------- | ------ | ---- | ------- |
|                         |          |              |     |                          |         |       | All editing | models |     | perform | better | than | trivial |
| ate                     | a “token | preservation |     | string”,                 | marking | token |             |        |     |         |        |      |         |
x intheinputsentenceX lowerbounds. Overall,wefindthatalleditormod-
|     | i   |     |     | as"Preserved"or"Not |     |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Preserved". Wethencomputethemacro-averaged elsoutperformlower-boundbaselineslikerandom
noise. Thisevenhappensintheno-contextLMset-
| F1  | score | between | the | token | preservation | strings |     |     |     |     |     |     |     |
| --- | ----- | ------- | --- | ----- | ------------ | ------- | --- | --- | --- | --- | --- | --- | --- |
ting,whereChatGPTiseditingitsownoutput(or
derivedfromthegoldeditandthemodel-generated
edit. Weremovestopwords,punctuationandlow- searchengineaugmentedPerplexityAI’soutputs),
|     |     |     |     |     |     |     | but can | still perform |     | non-trivial | corrections |     | (6.8 |
| --- | --- | --- | --- | --- | --- | --- | ------- | ------------- | --- | ----------- | ----------- | --- | ---- |
ercaseallwordsbeforeperformingthiscalculation.
ErrCorrforChatGPTcorrectingitsownoutputsvs
Toequallyweigheverysentence,F1scoresarein-
0.1forarandomnoiseeditorbaseline).
dependentlycomputedforeachsentencebeforea
finalaveraging. Retrieval significantly helps with editing per-
|                               |     |     |     |     |               |     | formance. | Across | all | base language |     | models | and |
| ----------------------------- | --- | --- | --- | --- | ------------- | --- | --------- | ------ | --- | ------------- | --- | ------ | --- |
| (2)EditCorrectness(EditCorr): |     |     |     |     | Oursecondmet- |     |           |        |     |               |     |        |     |
ric assesses the quality of the additional tokens metrics,augmentingtheeditorwithretrievedpara-
→
added by the model-generated edit. Specifically, graphs boosts performance (6.8 16.8 ErrCorr,
4.0→9.5SimAlforChatGPTcorrectingitsown
wecheckthetoken-levelF1score(Rajpurkaretal.,
2016)comparingthenewtokensaddedbythegold outputs). We hypothesize that the internal para-
edit G and the new tokens added by the model- metricknowledgeinChatGPThasinsufficientin-
formationaboutthetopic(aswealsoobservedin
| generatededitE. |     |     | Moreconcretely, |     |     |     |         |         |         |              |     |          |     |
| --------------- | --- | --- | --------------- | --- | --- | --- | ------- | ------- | ------- | ------------ | --- | -------- | --- |
|                 |     |     |                 |     |     |     | Section | 3.4) to | perform | fine-grained |     | editing, | and |
(cid:88)
|     | N   |        | =   | e   | ∈ G |     | usingexternalknowledgefromWikipediagreatly |       |              |     |             |     |      |
| --- | --- | ------ | --- | --- | --- | --- | ------------------------------------------ | ----- | ------------ | --- | ----------- | --- | ---- |
|     |     | common |     | i   |     |     |                                            |       |              |     |             |     |      |
|     |     |        |     |     |     |     | simplifies                                 | error | localization | and | correction. |     | This |
ei∈E,ei∈/X
alsocorroborateswithourfindingsinSection4.2.
|     | precision |        | = N    | /||{e | ∈   | E,e ∈/ X}|| |     |     |     |     |     |     |     |
| --- | --------- | ------ | ------ | ----- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
|     |           |        | common |       | i   | i           |     |     |     |     |     |     |     |
|     |           | recall | = N    | /||{g | ∈   | G,g ∈/ X}|| |     |     |     |     |     |     |     |
common i i 18Weavoidtakingthevectordifferencesbetweentheorigi-
nal/editedtextsinceeditvectors(Guuetal.,2018)werenot
| EditCorr(F1) |     |     | = HM(precision,recall) |     |     |     |     |     |     |     |     |     |     |
| ------------ | --- | --- | ---------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
explicitlymodeledinWietingetal.(2022).

|     |     |     | InstructGPT |     |     | ChatGPT | PerplexityAI |     |
| --- | --- | --- | ----------- | --- | --- | ------- | ------------ | --- |
Editor ErrLoc ErrCorr SimAl ErrLoc ErrCorr SimAl ErrLoc ErrCorr SimAl
| Inputcopying   |     |     | 37.1 | 0.0 | 0.0 38.8 | 0.0 0.0 | 45.6 0.0 | 0.0 |
| -------------- | --- | --- | ---- | --- | -------- | ------- | -------- | --- |
| 25%randomnoise |     |     | 44.1 | 0.1 | 0.5 45.5 | 0.1 0.4 | 45.2 0.0 | 0.3 |
ChatGPT
| No-context |     |     | 49.0 | 8.5 | 6.2 45.3 | 6.8 4.0 | 48.3 6.2 | 4.1 |
| ---------- | --- | --- | ---- | --- | -------- | ------- | -------- | --- |
No-context+atomicfacts 58.7 12.7 10.5 53.4 10.0 6.6 56.0 9.6 6.1
| Retrv→LM |     |     | 52.6 | 21.8 | 15.7 43.9 | 16.8 9.5 | 46.3 13.5 | 6.8 |
| -------- | --- | --- | ---- | ---- | --------- | -------- | --------- | --- |
Retrv→LM+atomicfacts 65.4 30.4 25.5 63.5 28.3 19.3 62.4 23.6 15.9
Table14:ResultsafterautomaticeditingwithChatGPTassuminggroundtruthverificationlabels.Alleditorsperform
better than trivial lowerbound baselines, and using retrieval and atomic fact labels boosts editing performance.
Detailsofautomaticmetrics(ErrLoc,ErrCorr,SimAl)aredefinedinSectionC.2.
| Atomic        | fact labels improve |              | error      | localization |     |     |     |     |
| ------------- | ------------------- | ------------ | ---------- | ------------ | --- | --- | --- | --- |
| and improve   | editing             | performance. |            | Across       | all |     |     |     |
| base language | models              | (with        | or without | retrieval)   |     |     |     |     |
weobservethatprovidingfine-grainedatomicfact
labelsimproveseditingperformance(16.8→28.3
ErrCorr,9.5→19.3SimAlforChatGPTcorrect-
| ingitsownoutputs). | Fine-grainedfactcorrectness |        |          |             |     |     |     |     |
| ------------------ | --------------------------- | ------ | -------- | ----------- | --- | --- | --- | --- |
| labels help        | the editor                  | easily | identify | problematic |     |     |     |     |
tokens,asseenbytheconsistentimprovementsin
ErrLocscores(43.9→63.5forChatGPTcorrect-
| ingitself).  | Wehypothesizeatomicfactshelpguide |            |        |                |     |     |     |     |
| ------------ | --------------------------------- | ---------- | ------ | -------------- | --- | --- | --- | --- |
| the editor   | with its editing                  | process    |        | (for instance, |     |     |     |     |
| perform      | a more targeted                   | search     | in     | the retrieved  |     |     |     |     |
| paragraphs), | resulting                         | in ErrCorr |        | improvements.  |     |     |     |     |
| We also      | find that atomic                  | fact       | labels | reduces        | the |     |     |     |
frequencyofeditorcopyingtheinputverbatimor
sayingTheinputhasnoerrorsfrom37.3%to3.9%.
| PerplexityAI | outputs     | are the    | hardest |         | to edit. |     |     |     |
| ------------ | ----------- | ---------- | ------- | ------- | -------- | --- | --- | --- |
| Overall,     | we find the | highest    | editing | success | for      |     |     |     |
| InstructGPT, | followed    | by ChatGPT |         | and the | least    |     |     |     |
successforPerplexityAI.Wehypothesizethisis
becausePerplexityAIalreadyusesasearchengine,
soerrorsaremuchmoresubtleasextensivelydis-
cussedinAppendixA.5.

Pleasebreakdownthefollowingsentenceintoindependentfacts:HemadehisactingdebutinthefilmTheMoonistheSun’sDream(1992),andcontinuedto
appearinsmallandsupportingrolesthroughoutthe1990s.
-Hemadehisactingdebutinthefilm.
-HemadehisactingdebutinTheMoonistheSun’sDream.
-TheMoonistheSun’sDreamisafilm.
-TheMoonistheSun’sDreamwasreleasedin1992.
-Afterhisactingdebut,heappearedinsmallandsupportingroles.
-Afterhisactingdebut,heappearedinsmallandsupportingrolesthroughoutthe1990s.
Pleasebreakdownthefollowingsentenceintoindependentfacts:Heisalsoasuccessfulproducerandengineer,havingworkedwithawidevarietyofartists,
includingWillieNelson,TimMcGraw,andTaylorSwift.
-Heissuccessful.
-Heisaproducer.
-Heisaengineer.
-Hehasworkedwithawidevarietyofartists.
-WillieNelsonisanartist.
-HehasworkedwithWillieNelson.
-TimMcGrawisanartist.
-HehasworkedwithTimMcGraw.
-TaylorSwiftisanartist.
-HehasworkedwithTaylorSwift.
Pleasebreakdownthefollowingsentenceintoindependentfacts:In1963,CollinsbecameoneofthethirdgroupofastronautsselectedbyNASAandheserved
astheback-upCommandModulePilotfortheGemini7mission.
-Collinsbecameanastronaut.
-Collinsbecameoneofthethirdgroupofastronauts.
-Collinsbecameoneofthethirdgroupofastronautsselected.
-CollinsbecameoneofthethirdgroupofastronautsselectedbyNASA.
-CollinsbecameoneofthethirdgroupofastronautsselectedbyNASAin1963.
-HeservedastheCommandModulePilot.
-Heservedastheback-upCommandModulePilot.
-HeservedastheCommandModulePilotfortheGemini7mission.
Pleasebreakdownthefollowingsentenceintoindependentfacts:Inadditiontohisactingroles,Batemanhaswrittenanddirectedtwoshortfilmsandis
currentlyindevelopmentonhisfeaturedebut.
-Batemanhasactingroles.
-Batemanhaswrittentwoshortfilms.
-Batemanhasdirectedtwoshortfilms.
-Batemanhaswrittenanddirectedtwoshortfilms.
-Batemaniscurrentlyindevelopmentonhisfeaturedebut.
Pleasebreakdownthefollowingsentenceintoindependentfacts:MichaelCollins(bornOctober31,1930)isaretiredAmericanastronautandtestpilotwho
wastheCommandModulePilotfortheApollo11missionin1969.
-MichaelCollinswasbornonOctober31,1930.
-MichaelCollinsisretired.
-MichaelCollinsisanAmerican.
-MichaelCollinswasanastronaut.
-MichaelCollinswasatestpilot.
-MichaelCollinswastheCommandModulePilot.
-MichaelCollinswastheCommandModulePilotfortheApollo11mission.
-MichaelCollinswastheCommandModulePilotfortheApollo11missionin1969.
Pleasebreakdownthefollowingsentenceintoindependentfacts:HewasanAmericancomposer,conductor,andmusicaldirector.
-HewasanAmerican.
-Hewasacomposer.
-Hewasaconductor.
-Hewasamusicaldirector.
Pleasebreakdownthefollowingsentenceintoindependentfacts:Shecurrentlystarsintheromanticcomedyseries,LoveandDestiny,whichpremieredin2019.
-ShecurrentlystarsinLoveandDestiny.
-LoveandDestinyisaromanticcomedyseries.
-LoveandDestinypremieredin2019.
Pleasebreakdownthefollowingsentenceintoindependentfacts:Duringhisprofessionalcareer,McCoyplayedfortheBroncos,theSanDiegoChargers,the
MinnesotaVikings,andtheJacksonvilleJaguars.
-McCoyplayedfortheBroncos.
-McCoyplayedfortheBroncosduringhisprofessionalcareer.
-McCoyplayedfortheSanDiegoChargers.
-McCoyplayedfortheSanDiegoChargersduringhisprofessionalcareer.
-McCoyplayedfortheMinnesotaVikings.
-McCoyplayedfortheMinnesotaVikingsduringhisprofessionalcareer.
-McCoyplayedfortheJacksonvilleJaguars.
-McCoyplayedfortheJacksonvilleJaguarsduringhisprofessionalcareer.
Pleasebreakdownthefollowingsentenceintoindependentfacts
Table15: ApromptgiventoInstructGPTtogenerateatomicfactsforagivensentence. Modelgeneratedatomic
factswererevisedbyhumaneditors.

Figure6: InstructionsfordataannotationinSection4. Wealsoprovidedademonstrationvideo,andgavefeedback
1-1duringthequalificationtask.

Figure7: AninterfacefordataannotationinSection4. AnnotatorswereabletonavigateWikipediaontheleft.
TheyannotatethreepiecesofgenerationsfromthreeLMsforthesamepromptinoneHITsinceitsavestime. Since
completingoneHITtakesconsiderableamountoftime(25min),weaddedafunctionthatallowssavingtheirwork
atanystageinthemiddleoftheHIT.