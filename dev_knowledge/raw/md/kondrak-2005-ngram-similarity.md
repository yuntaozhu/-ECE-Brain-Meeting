N-Gram Similarity and Distance
Grzegorz Kondrak
Department of Computing Science, Universityof Alberta,
Edmonton,AB, T6G 2E8, Canada
kondrak@cs.ualberta.ca
http://www.cs.ualberta.ca/~kondrak
Abstract. Inmanyapplications,itisnecessarytoalgorithmicallyquan-
tify the similarity exhibited by two strings composed of symbols from
a finite alphabet. Numerous string similarity measures have been pro-
posed.Particularlywell-knownmeasuresarebasedareeditdistanceand
the length of the longest common subsequence. We develop a notion
of n-gram similarity and distance. We show that edit distance and the
length of the longest common subsequence are special cases of n-gram
distanceandsimilarity,respectively.Weprovideformal,recursivedefini-
tionsofn-gramsimilarityanddistance,togetherwithefficientalgorithms
for computingthem.Weformulate a family of word similarity measures
based on n-grams, and report the results of experiments that suggest
that the new measures outperform theirunigram equivalents.
1 Introduction
In many applications, it is necessary to algorithmically quantify the similarity
exhibited by two stringscomposedofsymbols froma finite alphabet. For exam-
ple,forthetaskofautomaticidentificationofconfusabledrugnames,itishelpful
torecognizethatthe similaritybetweenToradol andTegretolisgreaterthanthe
similarity between Toradol and Inderal. The problem of measuring string simi-
larity occurs in a variety of fields, including bioinformatics, speech recognition,
information retrieval, machine translation, lexicography,and dialectology [9]. A
related issue of computing the similarity of texts as strings of words has also
been studied.
Numerous string similarity measures have been proposed. A particularly
widely-used method is edit distance (EDIT), also known as Levenshtein dis-
tance, which is defined as the minimum number of elementary edit operations
needed to transform one string into another. Another, closely related approach
reliesonfinding the lengthofthelongest common subsequence(LCS) ofthe two
strings. Other similarity measures are based on the number of shared n-grams,
i.e., substrings of length n.
In this paper, we develop a notion of n-gram similarity and distance.1 We
show that edit distance and the length of the LCS are special cases of n-gram
1 Thisisadifferentconcept from the q-gram similarity/distance [12],whichis simply
thenumberof common/distinct q-grams (n-grams) between two strings.
M.ConsensandG.Navarro(Eds.):SPIRE2005,LNCS3772,pp.115–126,2005.
(cid:1)c Springer-VerlagBerlinHeidelberg2005

| 116 | G. Kondrak |     |
| --- | ---------- | --- |
distance and similarity, respectively. We provide formal, recursive definitions of
n-gram similarity and distance, and efficient algorithms for computing them.
We formulate a family of wordsimilarity measuresbasedon n-grams,which are
intended to combine the advantages of the unigram and the n-gram measures.
We evaluate the new measures on three different word-comparison tasks: the
identification of genetic cognates, translational cognates, and confusable drug
names. The results of our experiments suggest that the new n-gram measures
| outperform | their unigram | equivalents. |
| ---------- | ------------- | ------------ |
We begin with n-gram similarity because we consider it to be conceptually
simpler than n-gram distance. The latter notion is then defined by modifying
| the formulation | of the     | former. |
| --------------- | ---------- | ------- |
| 2 Unigram       | Similarity |         |
In this section, we discuss the notion of the length of the LCS, which we view
as unigram similarity, in the context of its applicability as a string similarity
measure.After definingthe longestcommonsubsequenceprobleminastandard
way, we provide an alternative but equivalent formulation of the length of the
LCS. The recursive definition not only elucidates the relationship between the
LCSlengthandeditdistance,butalsogeneralizesnaturallyton-gramsimilarity
and distance.
| 2.1 Standard | Definition |     |
| ------------ | ---------- | --- |
ThestandardformulationoftheLCSproblemisasfollows[3].Givenasequence
X = x 1 ...x k , another sequence Z = z 1 ...z m is a subsequence of X if there
existastrictlyincreasingsequencei ,...,i ofindicesofXsuchthatforallj =
1 m
1,...,m, we havex =z .Forexample,taris asubsequence ofcontrary.Given
|     | ij  | j   |
| --- | --- | --- |
twosequencesXandY,wesaythatasequenceZisacommonsubsequenceofX
and Y if Z is a subsequence of both X and Y. In the LCS problem,we are given
two sequences and wish to find their maximum-length common subsequence.
For example, the LCS of natural and contrary is ntra. The LCS problem can be
| solved efficiently | using | dynamic programming. |
| ------------------ | ----- | -------------------- |
For the purpose of measuring string similarity, which is our focus here, only
the length of the LCS is important; the actual longest common subsequence is
irrelevant. The length of the LCS as a function of two strings is an interesting
| function      | in itself [2]. |     |
| ------------- | -------------- | --- |
| 2.2 Recursive | Definition     |     |
We propose the following formal, recursive definition of the function s(X,Y),
whichisequivalenttothelengthoftheLCS.LetX =x ...x andY =y ...y
1 k 1 l
be strings of length k and l, respectively, composed of symbols of a finite al-
phabet. In order to simplify the formulas,we introduce the following notational
shorthand, borrowed from Smyth [10]. Let Γ = (x ...x ,y ...y ) be a pair
i,j 1 i 1 j

|     |     |     |     |     | N-Gram | Similarity | and Distance | 117 |
| --- | --- | --- | --- | --- | ------ | ---------- | ------------ | --- |
andY,andΓ∗
ofprefixesofX =(x i+1 ...x k ,y j+1 ...y l )apairofsuffixesofX
i,j
and Y.
| For | strings | of length | one | or less, | we define | s directly: |     |     |
| --- | ------- | --------- | --- | -------- | --------- | ----------- | --- | --- |
(cid:1)
1if x=y
|     | s(x,(cid:2))=0, |     | s((cid:2),y)=0, |     |     | s(x,y)= |     |     |
| --- | --------------- | --- | --------------- | --- | --- | ------- | --- | --- |
0otherwise
where (cid:2) denotes an empty string, x and y denote single symbols.
| For | longer | strings, we | define | s recursively: |     |     |     |     |
| --- | ------ | ----------- | ------ | -------------- | --- | --- | --- | --- |
∗
|     |     | s(X,Y)=s(Γ |     | )=max(s(Γ |     | )+s(Γ | ))  |     |
| --- | --- | ---------- | --- | --------- | --- | ----- | --- | --- |
|     |     |            |     | k,l       |     | i,j   | i,j |     |
i,j
Thevaluesofiandj intheaboveformulaareconstrainedbytherequirement
Γ∗
that both Γ i,j and are non-empty. More specifically, the admissible values
i,j
| of i and | j are | given by | the following |     | set of | pairs: |     |     |
| -------- | ----- | -------- | ------------- | --- | ------ | ------ | --- | --- |
D(k,l)={0,...,k}×{0,...,l}−{(0,0),(k,l)}
D(2,1)={(0,1),(1,0),(1,1),(2,0)}.
For example,
It is straightforward to show by induction that s(X,Y) is always equal to
the length of the longest common subsequence of strings X and Y.
2.3 Rationale
Our recursive definition exploits the semi-compositionality of the LCS. Clearly,
LCS is not compositional in the usual sense, because the LCS of concatenated
stringsis notnecessarilyequalto the sumof their respective LCS.For example,
(cid:1)LCS(ab,a)(cid:1) = 1 and (cid:1)LCS(c,bc)(cid:1) = 1, but (cid:1)LCS(abc,abc)(cid:1) = 3. What is
certain is that the LCS of concatenated strings is always at least as long as the
| concatenation |     | of their respective |       | LCS: |       |       |      |     |
| ------------- | --- | ------------------- | ----- | ---- | ----- | ----- | ---- | --- |
|               |     | s(X ,Y              | )+s(X | ,Y   | )≤s(X | +X ,Y | +Y ) |     |
|               |     | 1                   | 1     | 2    | 2     | 1 2 1 | 2    |     |
Loosely speaking, s(X,Y) is superadditive, rather than compositional. It is
alwayspossible to compose the LCSof two strings by concatenating the LCS of
their substrings, provided that the decomposition of the strings into substrings
preserves all identity matches in the original LCS. Such a decomposition can
| always | be found  | (cf. Figure | 1,                | left pair). |     |     |     |     |
| ------ | --------- | ----------- | ----------------- | ----------- | --- | --- | --- | --- |
| 2.4    | A Reduced | Set         | of Decompositions |             |     |     |     |     |
Any decomposition of a pair of strings can be unambiguously defined by a pair
of indices. The set D contains all distinct decompositions of a pair of strings.
The numberofdistinctdecompositionsofa pairofstringsis (k+1)∗(l+1)−2.
The set of decomposition can be reduced without affecting the values of the
D(cid:3)
| function | s. Let | be the | following | set | of decompositions: |     |     |     |
| -------- | ------ | ------ | --------- | --- | ------------------ | --- | --- | --- |
(cid:3)
D (k,l)={k−1,k}×{l−1,l}−{(0,0),(k,l)}

| 118 | G. Kondrak |           |     |     |       |          |     |     |
| --- | ---------- | --------- | --- | --- | ----- | -------- | --- | --- |
|     | N A        | T U R A L |     | NA  | AT TU | UR RA AL |     |     |
|     | C O        | N T R A R | Y   | CO  | ON NT | TR RA AR | RY  |     |
Fig.1. A decompositions of a unigram alignment that preserves all identity matches
(left), and a decomposition of a bigram alignment with various levels of bigram simi-
larity (right)
Forexample,D(cid:3)(2,1)={(1,0),(1,1),(2,0)}.D(cid:3) nevercontainsmorethanthree
D(cid:3)
decompositions. By substituting D by in the recursive definition given in
section 2.2, we obtain an alternative, equivalent formulation of s:
| s(X,Y)=s(Γ |     | )=max(s(Γ | ),s(Γ |       | ),s(Γ   | )+s(x | ,y  | ))  |
| ---------- | --- | --------- | ----- | ----- | ------- | ----- | --- | --- |
|            |     | k,l       | k−1,l | k,l−1 | k−1,l−1 |       | k   | l   |
The alternativeformulationdirectlyyieldsthewell-knownefficientdynamic-
programming algorithm for computing the length of the LCS [14].
| 2.5 | Beyond | Unigram Similarity |     |     |     |     |     |     |
| --- | ------ | ------------------ | --- | --- | --- | --- | --- | --- |
The main weakness of the LCS length as a measure of string similarity is its
insensitivity to context. The problem is illustrated in Figure 2. The two word
pairs on the left demonstrate that neighbouring identity matches are a stronger
indication of similarity than identity matches that are far apart. The two word
pairs on the right show that parallel identity matches are a stronger indication
of similarity than identity matches that are separated by unmatched symbols.
A family of similarity measures that do take context into account is based
on Dice coefficient [1]. The measures are defined as the ratio of the number of
n-gramsthataresharedbytwostringsandthetotalnumberofn-gramsinboth
strings:
2×|n-grams(X)∩n-grams(Y)|
|n-grams(X)|+|n-grams(Y)|
where n-grams(X) is a multi-set of letter n-grams in X. Dice coefficient with
bigrams(DICE)isaparticularlypopularwordsimilaritymeasure.Forexample,
DICE(Zantac, Contac) =(2·3)/(5+5)=0.6 because three of the bigrams are
shared.
AlthoughmoresensitivetocontextthatLCSlength,DICEhasitsownprob-
lems.First, because ofits “low resolution”,it often fails to detect any similarity
| A M A | R Y L | D I O V A | N C | A R D | U R A | O S   | M I T | R O L |
| ----- | ----- | --------- | --- | ----- | ----- | ----- | ----- | ----- |
| A M I | K I N | A M I K I | N B | E N A | D R O | L B E | N A D | R O L |
Fig.2. Two pairs of words with different levels of similarity and the same length of
| thelongest | common | subsequence |     |     |     |     |     |     |
| ---------- | ------ | ----------- | --- | --- | --- | --- | --- | --- |

|     |     |     |     | N-Gram Similarity | and Distance | 119 |
| --- | --- | --- | --- | ----------------- | ------------ | --- |
between strings that are very much alike; for example, the pair Verelan/Virilon
haveno n-gramsin common.Second, DICE can returnthe maximum similarity
valueof1forstringsthatarenon-identical;forexample,bothXanexandNexan
{an,ex,ne,xa}.
are composed of the same set of bigrams: Finally, the measure
often associates n-grams that occur in radically different word positions, as in
the pair Voltaren/Tramadol.
Brew and McKelvie [1] propose an extension of DICE, called XXDICE, in
which the contribution of matching n-grams to the overall score depends on
their absolute positions in the strings. XXDICE performed best among several
tested measures, and it has subsequently been used by other researchers (e.g.,
[11]). Unfortunately, the definition of XXDICE is deficient: it does not specify
which matching bigramsare to be selected for the calculationof the score when
bigrams are not unique. There are a number of ways to amend the definition,
but it then becomes implementation-dependent, which means that the results
arenolongerfullyreplicable.The caseofXXDICEservesasanillustrationthat
it is essential to define string similarity measures rigorously.
In the next section, we formulate the notion of n-gram similarity s , which
n
is intended to combine the advantages of the LCS length and Dice coefficient
| while | eliminating | their      | flaws. |     |     |     |
| ----- | ----------- | ---------- | ------ | --- | --- | --- |
| 3     | n-Gram      | Similarity |        |     |     |     |
Themainideabehindn-gramsimilarityisgeneralizingtheconceptofthelongest
common subsequence to encompass n-grams, rather than just unigrams. We
formulaten-gramsimilarity asa functions ,wheren is a fixedparameter.s is
|     |     |     |     | n   |     | 1   |
| --- | --- | --- | --- | --- | --- | --- |
equivalent to the unigram similarity function s defined in Section 2.2.
3.1 Definition
For the purpose of providing a concise recursive definition of n-gram similarity,
we slightly modify our convention regarding Γ. When dealing with n-grams for
Γ∗
n > 1, we require Γ and to contain at least one complete n-gram. This
|     |     | i,j | i,j |     |     |     |
| --- | --- | --- | --- | --- | --- | --- |
requirementisconsistentwith ourpreviousconventionfor n=1.If bothstrings
| are shorter | than | n, s | n is undefined. |     |     |     |
| ----------- | ---- | ---- | --------------- | --- | --- | --- |
Inthe simplestcase,whenthereis onlyonecomplete n-gramineither ofthe
| strings, | n-gram | similarity | is defined   | to be zero: |            |     |
| -------- | ------ | ---------- | ------------ | ----------- | ---------- | --- |
|          |        | s (Γ       | )=0 if (k =n | ∧ l<n)∨(k   | <n ∧ l =n) |     |
|          |        | n k,l      |              |             |            |     |
Let Γn = (x ...x ,y ...y ) be a pair of n-grams in X and Y. If
|     | i,j | i+1 | i+n j+1 | j+n |     |     |
| --- | --- | --- | ------- | --- | --- | --- |
bothstringscontainexactlyonen-gram,ourinitialdefinitionisstrictlybinary:1
if the n-gramsare identical,and 0 otherwise.(Later, we will consider modifying
| this | part of the | definition.) |     |     |     |     |
| ---- | ----------- | ------------ | --- | --- | --- | --- |
(cid:1)
∀
|     |     |      |           | 1 if 1≤u≤n  | x =y |     |
| --- | --- | ---- | --------- | ----------- | ---- | --- |
|     |     | s (Γ | )=s (Γn   | )=          | u u  |     |
|     |     | n    | n,n n 0,0 | 0 otherwise |      |     |

| 120 | G.         | Kondrak  |     |               |                  |              |             |     |
| --- | ---------- | -------- | --- | ------------- | ---------------- | ------------ | ----------- | --- |
|     | For longer | strings, | we  | define n-gram | similarity       | recursively: |             |     |
|     |            | s(X,Y)=s |     | )=max(s       |                  | )+s          | ∗           |     |
|     |            |          | n   | (Γ k,l        | n (Γ i+n−1,j+n−1 |              | n (Γ i,j )) |     |
i,j
Thevaluesofiandj intheaboveformulaareconstrainedbytherequirement
Γ∗
that both Γ i,j and contain at least one complete n-gram. More specifically,
i,j
the admissible values of i and j are given by D(k−n+1,l−n+1), where D is
| the | set defined | in  | Section | 2.2.       |     |     |     |     |
| --- | ----------- | --- | ------- | ---------- | --- | --- | --- | --- |
| 3.2 | Computing   |     | n-Gram  | Similarity |     |     |     |     |
As in the case of s, a set of three decompositions is sufficient for computing s .
n
|     | s   | (Γ )=max(s | (Γ  | ),s   | (Γ ),s    | (Γ      | )+s (Γ n   | ))  |
| --- | --- | ---------- | --- | ----- | --------- | ------- | ---------- | --- |
|     | n   | k,l        | n   | k−1,l | n k,l−1 n | k−1,l−1 | n k −n,l−n |     |
An efficient dynamic-programmingalgorithmfor computing n-gramsimilar-
itycanbederiveddirectlyfromthealternativeformulation.Forn=1,itreduces
tothewell-knownalgorithmforcomputingthelengthoftheLCS.Thealgorithm
| is  | discussed | in detail | in Section | 5.         |     |     |     |     |
| --- | --------- | --------- | ---------- | ---------- | --- | --- | --- | --- |
| 3.3 | Refined   | n-Gram    |            | Similarity |     |     |     |     |
The binary n-gram similarity defined above is quite crude in the sense that it
does not differentiate between slightly different n-gramsand totally different n-
grams. We consider here two possible refinements to the similarity scale. The
firstalternative,henceforthreferredto ascomprehensive n-gramsimilarity,is to
| compute |     | the standard | unigram | similarity | between | n-grams: |     |     |
| ------- | --- | ------------ | ------- | ---------- | ------- | -------- | --- | --- |
1
|     |     |     |     | (Γn)= | (Γn)  |     |     |     |
| --- | --- | --- | --- | ----- | ----- | --- | --- | --- |
|     |     |     |     | s n   | s 1   |     |     |     |
|     |     |     |     |       | i,j n | i,j |     |     |
The second alternative, henceforth referred to as positional n-gram similarity,
is to simply to count identical unigrams in corresponding positions within the
n-grams:
(cid:2)n
1
(Γn)=
|     |     |     | s   | n   | s 1 (x i+u | ,y j+u ) |     |     |
| --- | --- | --- | --- | --- | ---------- | -------- | --- | --- |
|     |     |     |     | i,j | n          |          |     |     |
u=1
The advantage of the positional n-gram similarity is that it can be computed
| faster | than | the comprehensive |     | n-gram | similarity. |     |     |     |
| ------ | ---- | ----------------- | --- | ------ | ----------- | --- | --- | --- |
Figure1(right)showsabigramdecompositionofapairofwordswithvarious
levelsofbigramsimilarity.Thesolidlinkdenotesacompletematch.Thedashed
links are partial matches according to both positional and comprehensive n-
gram similarity. The dotted link indicates a partial match that is detected by
thecomprehensiven-gramsimilarity,butnotbythepositionaln-gramsimilarity.

N-Gram Similarity and Distance 121
4 n-Gram Distance
SincethestandardeditdistanceisalmostadualnotiontothelengthoftheLCS,
the definition of n-gramdistance differs from the definition of n-gramsimilarity
only in details:
1. Recursive definition of edit distance:
(cid:1)
0if x=y
d(x,(cid:2))=1, d((cid:2),y)=1, d(x,y)=
1otherwise
∗
d(X,Y)=d(Γ )=min(d(Γ )+d(Γ ))
k,l i,j i,j
i,j
2. An alternative formulation of edit distance with a reduced set of decompo-
sitions:
d(X,Y)=d(Γ k,l )=min(d(Γ k−1,l )+1,d(Γ k,l−1 )+1,d(Γ k−1,l−1 )+d(x k ,y l ))
3. Definition of n-gram edit distance:
d (Γ )=1 if (k =n ∧ l <n)∨(k <n ∧ l =n)
n k,l
(cid:1)
d (Γ )=d (Γn )= 0 if ∀ 1≤u≤n x u =y u
n n,n n 0,0 1 otherwise
∗
d n (Γ k,l )=min(d n (Γ i+n−1,j+n−1 )+d n (Γ i,j ))
i,j
4. An alternative formulation of n-gramdistance:
d n (Γ k,l )=min(d n (Γ k−1,l )+1,d n (Γ k,l−1 )+1,d n (Γ k−1,l−1 )+d n (Γ k n −n,l−n ))
5. Three variants of n-gram distance d (Γn ):
n i,j
(a) The binary n-grams distance, as defined in 3.
(b) The comprehensive n-grams distance: d (Γn)= 1d (Γn).
n i,j(cid:3) n 1 i,j
(c) The positional n-gram distance: d (Γn )= 1 n d (x ,y ).
n i,j n u=1 1 i+u j+u
The positional n-gram distance is equivalent to the the comprehensive n-
gram distance for n=2. All three variants are equivalent for n=1.
5 n-Gram Word Similarity Measures
Inthissection,wedefineafamilyofwordsimilaritymeasures(Table1),whichin-
cludetwowidely-usedmeasures,the longestcommonsubsequenceratio(LCSR)
andthe normalizededitdistance (NED), anda seriesofnew measuresbasedon
n-grams,n>1. First, however,we need to consider two measure-relatedissues:
normalization and affixing.
Normalizationis a method of discounting the length of wordsthat are being
compared.The lengthofthe LCSoftworandomly-generatedstringsgrowswith

122 G. Kondrak
Table 1. A classification of measures based on n-grams
n = 1 n = 2 n = 3 ... n
Similarity LCSR BI-SIM TRI-SIM ... n-SIM
Distance NED BI-DIST TRI-DIST ... n-DIST
1
the length of the strings [2]. In order to avoid the length bias, a normalized
variant of the LCS is usually preferred. The longest common subsequence ratio
(LCSR) is computed by dividing the length ofthe longestcommonsubsequence
by the length of the longer string [8]. Edit distance is often normalized in a
similarway,i.e.bythelengthofthelongerstring(e.g.,[5]).However,Marzaland
Vidal[6]proposeinsteadtonormalizebythe lengthoftheediting pathbetween
strings, which requires a somewhat more complex algorithm. We refer to these
two variants of Normalized Edit Distance as NED and NED , respectively.
1 2
Affixingisawayofincreasingsensitivitytothesymbolsatstringboundaries.
Without affixing, the boundary symbols participate in fewer n-grams than the
internalsymbols.Forexample,thewordabccontainstwobigrams:abandbc;the
initialsymbolaoccursinonlyonebigram,whilethe internalsymbolboccursin
two bigrams. In the context of measuring word similarity, this is a highly unde-
sirableeffectbecausetheinitialsymbolsplaycrucialroleinhumanperceptionof
words. In order to avoid the negative bias, extra symbols are sometimes added
to the beginnings and/or endings of words.
The proposed n-gram similarity and distance measures N-SIM and N-DIST
incorporate both normalization and affixing (Figure 3). Our affixing method
is aimed at emphasizing the initial segments, which tend to be much more
Algorithm N-SIM(X,Y) Algorithm N-DIST(X,Y)
K ←length(X) K ←length(X)
L←length(Y) L←length(Y)
for u←1 to N −1 do for u←1 to N−1 do
X ←x(cid:1) +X X ←x(cid:1) +X
1 1
Y ←y(cid:1) +Y Y ←y(cid:1) +Y
1 1
for i←0 to K do for i←0 to K do
S[i,0]←0 D[i,0]←i
for j ←1 to L do for j ←1 to L do
S[0,j]←0 D[0,j]←j
for i←1 to K do for i←1 to K do
for j ←1 to L do for j ←1 to L do
S[i,j]←max( D[i,j]←min(
S[i−1,j], D[i−1,j]+1,
S[i,j−1], D[i,j−1]+1,
S[i−1,j−1]+s N (Γ i N −1,j−1 )) D[i−1,j−1]+d N (Γ i N −1,j−1 ))
return S[K,L]/max(K,L) return D[K,L]/max(K,L)
Fig.3. The algorithms for computingN-SIMand N-DISTof strings X and Y

N-Gram Similarity and Distance 123
important than final segments in determining word similarity. A unique special
symbolisdefinedforeachletteroftheoriginalalphabet.Eachwordisaugmented
with a prefix composed of n−1 copies of the special symbol that corresponds
to the initial letter of the word. For example, if n = 3, amikin is transformed
into ˆaˆaamikin. Assuming that the original words have lengths K and L respec-
tively,the number ofn-gramsis thus increasedfromK+L−2(n−1)to K+L.
The normalization is achieved by simply dividing the total similarity score by
max(K,L), the original length of the longer word. This procedure guarantees
that the new measures return 1 if and only if the words are identical, and 0 if
and only if the words have no letters in common.
6 Experiments
In this section we describe three experiments aimed and comparing the effec-
tiveness of the standardunigram similarity measures with the proposed n-gram
measures. The three experiments correspond to applications in which the stan-
dard unigram measures have been used in the past.
6.1 Evaluation Methodology
Our evaluation methodology is the same in all three experiments. The underly-
ing assumption is that pairs of words that are known to be related in some way
(e. g., by sharing a common origin) exhibit on average much greater similarity
thanunrelatedpairs.Weevaluatetheeffectivenessofseveralsimilaritymeasures
by calculating how well they are able to distinguish related wordpairs from un-
relatedwordpairs.Inorderforameasuretoachieve100%accuracy,anyrelated
pairwouldhavetobeassignedahighersimilarityvaluethananyunrelatedpair.
In practice, most of the relatedpairs should occur near the top of a list of pairs
sorted by their similarity value.
The evaluation procedure is as follows:
1. Establish a gold standardset G of word pairs that are known to be related.
2. Generate a much larger set C of candidate word pairs, C ⊃G.
3. Compute the similarity of all pairs in C using a similarity measure.
4. SortthepairsinC accordingtothesimilarityvalue,breakingtiesrandomly.
5. Compute the 11-point interpolated average precision on the sorted list.
The 11-point interpolated average precision is an information-retrieval eval-
uation technique. Precision is computed for the recall levels of 0%, 10%, 20%,
..., 100%, and then averaged to yield a single number. We uniformly set the
precision value at 0% recall to 1, and the precision value at 100% recall to 0.
6.2 Data
Genetic Cognates. Cognates are words of the same originthat belong to dis-
tinct languages. For example, English father, German vater, and Norwegian far
constitute a set of cognates, since they all derive from a single Proto-Germanic

124 G. Kondrak
word(reconstructedas*faδ¯er). Theidentificationofcognatesis oneofthe prin-
cipaltasksofhistoricallinguistics.Cognatesareusuallysimilarintheirphonetic
form, which makes string similarity an important clue for their identification.
In the first experiment, we extracted all nouns from two machine-readable
word lists that had been used to produce an Algonquian etymological dictio-
nary [4]. The two sets contain 1628 Cree nouns and 1023 Ojibwa nouns, re-
spectively. The set C of candidate pairs was created by generating all possible
Cree-Ojibwa pairs (a Cartesian product). An electronic version of the dictio-
nary, which contains over four thousand Algonquian cognate sets, served as the
gold standard G. The task was to identify 409 cognate pairs among 1,650,780
candidate word pairs (approx. 0.025%).
Translational Cognates. Cognates are usually similar in form and meaning,
which makesstring similarity a useful clue for wordalignment in statisticalma-
chinetranslation.BothLCSRandeditdistancehavebeenemployedforcognate
identification in bitext-related tasks (e.g., [8]).
In the second experiment, we used Blinker, a word-aligned French-English
bitext containing translations of 250 sentences taken from the Bible [7]. For the
evaluation, we manually identified all cognate pairs in the bitext, using word
alignment links as clues. The candidate set of pairs was generated by taking a
Cartesianproduct of words in corresponding sentences. This time, the task was
to identify those 959 pairs among 36,879 candidate pairs (approx. 2.6%).
Confusable Drug Names. Many drug names either look or sound similar,
which causes potentially dangerous errors. An example of a confusable drug
name pair is Zantac and Zyrtec. Orthographic similarity measures have been
applied in the past for detecting confusable drug names. For example, Lambert
et al. [5] tested edit distance, normalized edit distance, and LCS, among other
measures.
In the final experiment, we extracted582 unique drug names form an online
list of confusable drug names [13]. The candidate set of pairs was the Cartesian
product of the names. The list itself served as the gold standard. The task was
toidentify798confusablepairsamong338,142candidatepairs(approx.0.23%).
6.3 Results and Discussion
Table 2 compares the average precision achieved by various measures in all
three experiments. The similarity-based measures are given first, followed by
the distance-based measures. PREFIX is a baseline-type measure that returns
the length of the common prefix divided by the length of the longer string.
Three values are given for the N-SIM and N-DIST measures corresponding to
the binary, positional, and comprehensive variants, respectively.
Although the average precision values vary depending on the difficulty of
a particular task, the relative performance of the measures is quite consistent
across the three experiments. The positional and comprehensive variants of the
n-grammeasuresoutperformthestandardunigrammeasures(theonlyexception
isthatNEDslightlyoutperformsTRI-DISTongeneticcognates).Thedifference

|     |     | N-Gram | Similarity | and Distance | 125 |
| --- | --- | ------ | ---------- | ------------ | --- |
Table 2. The average interpolated precision for various measures on three word-
| similarity tasks |             |           |           |                |      |
| ---------------- | ----------- | --------- | --------- | -------------- | ---- |
|                  | DICE XXDICE | LCS LCSR  | BI-SIM    | TRI-SIM        |      |
|                  |             |           | bin pos   | com bin pos    | com  |
| Drug names       | .262 .308   | .152 .330 | .377 .403 | .400 .356 .393 | .396 |
Genetic cognates .394 .519 .141 .564 .526 .597 .595 .466 .593 .589
Transl. cognates .775 .815 .671 .798 .841 .841 .846 .829 .838 .832
|           | PREFIX EDIT | NED NED   | BI-DIST   | TRI-DIST       |      |
| --------- | ----------- | --------- | --------- | -------------- | ---- |
|           |             | 1         | 2         |                |      |
|           |             |           | bin pos   | com bin pos    | com  |
| Drugnames | .256 .275   | .364 .369 | .389 .399 | .399 .352 .391 | .391 |
Genetic cognates .276 .513 .592 .592 .545 .602 .602 .468 .589 .589
Transl. cognates .721 .681 .821 .823 .840 .838 .838 .828 .829 .830
isespeciallypronouncedinthedrugnamesexperiment.Thebigrammethodsare
overall somewhat more effective than the trigram methods. The differences be-
tween the positional and the comprehensive n-gram variants, where they exist,
are insignificant, but the binary variant is sometimes much worse. The normal-
ized versions substantially outperform the un-normalized versions in all cases.
NEDconsistentlyoutperformsLCSR,butthedifferencesbetweenthesimilarity-
based methods and the distance-based methods for n>1 are minimal.
| 6.4 Similarity | vs. Distance |     |     |     |     |
| -------------- | ------------ | --- | --- | --- | --- |
Interestingly,thereisaconsiderablevariationinperformanceamongtheunigram
measures,butnotamongthemultigrammeasures.ThereasonmaylieinLCSR’s
lack of context-sensitivity, which we mentioned in Section 2.5. Consider again
the two pairs on the right side of Figure 2. The LCS lengths are identical in
bothcases(3),buteditdistancesdiffer(7and5,respectively).Noticethehighly
parallelarrangementoftheidentitylinksbetweenthesecondpair,aphenomenon
whichusuallypositivelycorrelateswithperceptualsimilarity.Sincebydefinition
LCSR is concerned only with the number of identity matches, it cannot detect
such a clue. The multigram measures, on the other hand, are able to recognize
the difference, because n-grams provide an alternative mechanism for taking
| context into account. |     |     |     |     |     |
| --------------------- | --- | --- | --- | --- | --- |
7 Conclusion
We have formulated a new concept of n-gram similarity and distance, which
generalizes the standard unigram string similarity and distance. On that ba-
sis, we have formally defined a family of new measures of word similarity, We
haveevaluatedthe new measuresonthree differentword-comparisontasks.The
experiments suggest that the new n-gram measures outperform the unigram
measures. In general, normalization by word length is a must. With respect to

126 G. Kondrak
theunigrammeasures,wehavearguedthatthenormalizededitdistancemaybe
more appropriate than LCSR. For n ≥ 2, BI-SIM with positional n-gram simi-
larity is recommended as it combines relative speed with high overallaccuracy.
Acknowledgments
Thanks to Bonnie Dorr for collaborationon the confusable drug names project.
This research was supported by Natural Sciences and Engineering Research
Council of Canada.
References
1. Chris Brew and David McKelvie. 1996. Word-pairextraction for lexicography. In
Proc. of the 2nd Intl Conf. on New Methods in Language Processing, pages45–55.
2. Vacl´av Chv´atal and David Sankoff. 1975. Longest common subsequences of two
random sequences. Journal of Applied Probability, 12:306–315.
3. Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, and Clifford Stein.
2001. Introduction to Algorithms. The MIT Press, second edition.
4. John Hewson. 1993. A computer-generated dictionary of proto-Algonquian. Hull,
Quebec: Canadian Museum of Civilization.
5. Bruce L. Lambert, Swu-Jane Lin, Ken-Yu Chang, and Sanjay K. Gandhi. 1999.
Similarity AsaRiskFactorinDrug-NameConfusion Errors: TheLook-Alike(Or-
thographic) and Sound-Alike(Phonetic) Model. Medical Care, 37(12):1214–1225.
6. A.MarzalandE.Vidal. 1993. Computationofnormalizededitdistanceandappli-
cations. IEEE Trans. Pattern Analysis and Machine Intelligence, 15(9):926–932.
7. I.DanMelamed.1998.Manualannotationoftranslationalequivalence:TheBlinker
project. Technical Report IRCS #98-07, University of Pennsylvania.
8. I.DanMelamed. 1999. Bitext mapsandalignment viapatternrecognition. Com-
putational Linguistics, 25(1):107–130.
9. D.SankoffandJ.B. Kruskal,editors. 1983. Time warps, string edits, and macro-
molecules: the theory and practice of sequence comparison. Addison-Wesley.
10. Bill Smyth. 2003. Computing Patterns in Strings. Pearson.
11. Dan Tufis. 2002. A cheap and fast way to build useful translation lexicons. In
Proc. of the 19th Intl Conf. on Computational Linguistics, pages 1030–1036.
12. Esko Ukkonen. 1992. Approximate string-matching with q-grams and maximal
matches. Theoretical Computer Science, 92:191–211.
13. Use caution — avoid confusion. United States Pharmacopeial Convention Quality
Review, No. 76, March 2001. Available from http://www.bhhs.org/pdf/qr76.pdf.
14. Robert A. Wagner and Michael J. Fischer. 1974. The string-to-string correction
problem. Journal of the Association for Computing Machinery, 21(1):168–173.